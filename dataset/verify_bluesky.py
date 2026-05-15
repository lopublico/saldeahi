#!/usr/bin/env python3
"""Verificador de cuentas de Bluesky contra dataset Excel."""

import time
import re
import unicodedata
import requests
import openpyxl

EXCEL_PATH = "/Users/avelrom/Code/saldeahi/dataset/datosfinales.xlsx"
API_BASE = "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile"
SLEEP_BETWEEN = 0.3

# Categorías institucionales donde el nombre no tiene que coincidir exactamente
INSTITUTIONAL_CATS = {"AGE", "Partidos", "Autonomías", "Universidades"}
# Categorías de personas individuales
INDIVIDUAL_CATS = {"Congreso", "Senado", "Gobierno"}


def normalize(s):
    """Normaliza string: minúsculas, sin tildes, sin puntuación."""
    if not s:
        return ""
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return s.strip()


def extract_surnames(full_name):
    """
    Extrae apellidos de un nombre completo.
    Asume formato 'Nombre Apellido1 Apellido2' o 'Nombre Apellido'.
    Para nombres con partículas (de, la, del, etc.) las incluye.
    Devuelve lista de tokens normalizados (excluye el primer token como nombre).
    """
    parts = full_name.strip().split()
    if len(parts) <= 1:
        return [normalize(parts[0])] if parts else []
    # Heurística: el primer token es nombre, el resto son apellidos
    # Si hay partículas (de, la, del, los, las) entre nombre y apellido, las saltamos
    stopwords = {"de", "la", "del", "los", "las", "el", "y"}
    surnames = []
    skip_first = True
    for part in parts:
        if skip_first:
            skip_first = False
            continue
        norm = normalize(part)
        if norm and norm not in stopwords:
            surnames.append(norm)
    return surnames


def display_name_matches(dataset_name, display_name):
    """
    Comprueba si el display name contiene al menos uno de los apellidos
    del nombre en el dataset.
    """
    surnames = extract_surnames(dataset_name)
    if not surnames:
        return True  # No se puede verificar
    dn_norm = normalize(display_name)
    for surname in surnames:
        if surname and len(surname) > 2 and surname in dn_norm:
            return True
    return False


def check_account(handle, dataset_name, category):
    """
    Consulta la API de Bluesky y devuelve un dict con el resultado.
    """
    result = {
        "handle": handle,
        "dataset_name": dataset_name,
        "category": category,
        "status": None,
        "display_name": None,
        "description": None,
        "issues": [],
    }

    if not handle or str(handle).strip() == "" or str(handle).strip().lower() == "nan":
        result["status"] = "sin_handle"
        result["issues"].append("Sin handle en dataset")
        return result

    handle = str(handle).strip()
    url = f"{API_BASE}?actor={handle}"

    try:
        resp = requests.get(url, timeout=10)
    except requests.RequestException as e:
        result["status"] = "error_red"
        result["issues"].append(f"Error de red: {e}")
        return result

    if resp.status_code == 404:
        result["status"] = "no_encontrada"
        result["issues"].append("Cuenta no encontrada (404)")
        return result

    if resp.status_code != 200:
        result["status"] = "error_http"
        result["issues"].append(f"HTTP {resp.status_code}")
        return result

    data = resp.json()
    display_name = data.get("displayName", "") or ""
    description = data.get("description", "") or ""

    result["status"] = "ok"
    result["display_name"] = display_name
    result["description"] = description

    # Para categorías individuales, verificar que el nombre coincida
    if category in INDIVIDUAL_CATS:
        if not display_name_matches(dataset_name, display_name):
            result["issues"].append(
                f"Display name '{display_name}' no contiene apellidos de '{dataset_name}'"
            )

        # Bio vacía en persona individual es sospechoso
        if not description.strip():
            result["issues"].append("Bio vacía (cuenta individual)")

    # Para cualquier categoría: si el display name está completamente vacío, señalar
    if not display_name.strip() and category in INDIVIDUAL_CATS:
        result["issues"].append("Display name vacío")

    return result


def main():
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    print(f"Total de filas a procesar: {len(rows)}")

    suspicious = []
    not_found = []
    correct = 0
    total_with_handle = 0

    for i, row in enumerate(rows, start=2):
        if len(row) < 5:
            continue

        category = str(row[0]).strip() if row[0] else ""
        name = str(row[1]).strip() if row[1] else ""
        handle_raw = row[4]  # Columna E, índice 4

        if not handle_raw or str(handle_raw).strip() in ("", "None", "nan"):
            continue

        handle = str(handle_raw).strip()
        total_with_handle += 1

        result = check_account(handle, name, category)

        if i % 20 == 0:
            print(f"  Procesada fila {i}... ({total_with_handle} con handle hasta ahora)")

        if result["status"] == "no_encontrada" or result["status"] in ("error_http", "error_red", "sin_handle"):
            if result["status"] == "no_encontrada":
                not_found.append(result)
            else:
                suspicious.append(result)
        elif result["issues"]:
            suspicious.append(result)
        else:
            correct += 1

        time.sleep(SLEEP_BETWEEN)

    # Imprimir informe
    print("\n" + "=" * 70)
    print("INFORME DE CUENTAS SOSPECHOSAS")
    print("=" * 70)

    all_problems = [r for r in suspicious if r["status"] != "no_encontrada"]
    not_found_list = [r for r in suspicious if r["status"] == "no_encontrada"] + not_found

    if all_problems or not_found_list:
        print(f"\n{'CUENTAS NO ENCONTRADAS (404)':}")
        print("-" * 70)
        for r in not_found_list:
            print(f"  [{r['category']}] {r['dataset_name']}")
            print(f"    Handle: {r['handle']}")
            for issue in r["issues"]:
                print(f"    -> {issue}")
            print()

        print(f"\n{'CUENTAS SOSPECHOSAS (encontradas pero con problemas)':}")
        print("-" * 70)
        for r in all_problems:
            print(f"  [{r['category']}] {r['dataset_name']}")
            print(f"    Handle: {r['handle']}")
            print(f"    Display name: {r['display_name']}")
            bio_preview = (r["description"] or "")[:150]
            print(f"    Bio: {bio_preview!r}")
            for issue in r["issues"]:
                print(f"    -> {issue}")
            print()

    print("=" * 70)
    print("RESUMEN")
    print("=" * 70)
    print(f"  Total filas con handle: {total_with_handle}")
    print(f"  Correctas:              {correct}")
    print(f"  No encontradas (404):   {len(not_found_list)}")
    print(f"  Sospechosas:            {len(all_problems)}")
    print(f"  Total problemas:        {len(not_found_list) + len(all_problems)}")


if __name__ == "__main__":
    main()
