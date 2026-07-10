#!/usr/bin/env python3
"""Publica una nueva versión del dataset en Zenodo (CSV, JSON y XLSX)."""

import csv
import io
import json
import os
import re
import sys
import requests
import openpyxl

BASE_URL = "https://zenodo.org/api"
TOKEN = os.environ["ZENODO_TOKEN"]
DEPOSIT_ID = os.environ["ZENODO_DEPOSIT_ID"]
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_DIR = os.path.dirname(DATASET_DIR)
XLSX        = os.path.join(DATASET_DIR, "datosfinales.xlsx")
EXPORT_BUTTON = os.path.join(PROJECT_DIR, "src", "components", "ExportButton.tsx")

COLUMNS = [
    "categoria", "nombre", "twitter", "twitter_activo",
    "bluesky", "bluesky_activo", "mastodon", "mastodon_activo",
    "email", "detalle", "tipo", "grupo", "circunscripcion", "ccaa", "partido",
]


def load_rows():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Sheet1"]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not any(row):
            continue
        rows.append(["" if v is None else str(v) for v in row[:len(COLUMNS)]])
    wb.close()
    return rows


def build_csv(rows: list) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(COLUMNS)
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


def build_json(rows: list) -> bytes:
    records = [dict(zip(COLUMNS, row)) for row in rows]
    return json.dumps(records, ensure_ascii=False, indent=2).encode("utf-8")


def check(r, msg):
    if not r.ok:
        print(f"Error en {msg}: {r.status_code} — {r.text}", file=sys.stderr)
        sys.exit(1)
    return r.json()


def upload(bucket_url, filename, data, content_type):
    r = requests.put(
        f"{bucket_url}/{filename}",
        data=data,
        headers={**HEADERS, "Content-Type": content_type},
    )
    check(r, f"upload {filename}")
    print(f"  Subido: {filename} ({len(data):,} bytes)")


def update_export_button(new_id):
    with open(EXPORT_BUTTON, encoding="utf-8") as f:
        content = f.read()
    updated = re.sub(
        r'const ZENODO_RECORD = "https://zenodo\.org/records/\d+";',
        f'const ZENODO_RECORD = "https://zenodo.org/records/{new_id}";',
        content,
    )
    if updated == content:
        print(f"  Aviso: no se encontró ZENODO_RECORD en {EXPORT_BUTTON}", file=sys.stderr)
        return
    with open(EXPORT_BUTTON, "w", encoding="utf-8") as f:
        f.write(updated)
    print(f"  Actualizado: {EXPORT_BUTTON}")


def main():
    print("Leyendo Excel...")
    rows = load_rows()
    print(f"  {len(rows)} filas")

    csv_bytes  = build_csv(rows)
    json_bytes = build_json(rows)
    with open(XLSX, "rb") as f:
        xlsx_bytes = f.read()

    print(f"Creando nueva versión del depósito {DEPOSIT_ID}...")
    r = requests.post(f"{BASE_URL}/deposit/depositions/{DEPOSIT_ID}/actions/newversion", headers=HEADERS)
    draft = check(r, "newversion")

    new_url = draft["links"]["latest_draft"]
    new_id = new_url.rstrip("/").split("/")[-1]
    print(f"  Borrador creado: ID {new_id}")

    r = requests.get(f"{BASE_URL}/deposit/depositions/{new_id}", headers=HEADERS)
    deposition = check(r, "get deposition")
    bucket_url = deposition["links"]["bucket"]

    print("Eliminando archivos anteriores del borrador...")
    for f in deposition.get("files", []):
        rd = requests.delete(f"{BASE_URL}/deposit/depositions/{new_id}/files/{f['id']}", headers=HEADERS)
        if rd.ok:
            print(f"  Eliminado: {f['filename']}")
        else:
            print(f"  Aviso: no se pudo borrar {f['filename']}: {rd.status_code}", file=sys.stderr)

    print("Subiendo archivos...")
    upload(bucket_url, "dataset.csv",  csv_bytes,  "application/octet-stream")
    upload(bucket_url, "dataset.json", json_bytes, "application/octet-stream")
    upload(bucket_url, "dataset.xlsx", xlsx_bytes, "application/octet-stream")

    print("Publicando nueva versión...")
    r = requests.post(f"{BASE_URL}/deposit/depositions/{new_id}/actions/publish", headers=HEADERS)
    result = check(r, "publish")
    print(f"Publicado. DOI: {result.get('doi', '—')}")
    print(f"URL: https://zenodo.org/records/{result['id']}")

    print("Sincronizando enlace de descarga en la web...")
    update_export_button(result["id"])


if __name__ == "__main__":
    main()
