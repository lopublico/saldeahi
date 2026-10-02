#!/usr/bin/env python3
"""
historico.py — Histórico real del dataset: quién estaba en cada momento.

Los snapshots mensuales de total.json solo dicen "cuántos" había. Este script
añade la dimensión que faltaba: altas, bajas y cambios de cargo en Gobierno,
Congreso, Senado y el resto de categorías, de modo que una persona que sale de
una cámara o del Gobierno no desaparezca sin dejar rastro.

Ficheros:
    dataset/historical/YYYY-MM-DD.json   Snapshot completo (lista de entidades).
                                         Los mensuales (día 01) los guarda el
                                         workflow; los intermedios, este script
                                         cuando detecta cambios.
    dataset/historical/cambios.json      Registro de eventos (alta, baja, cargo,
                                         grupo, cobertura).
    src/data/historico.json              Serie agregada + cambios, para la web.

Uso:
    python3 dataset/scripts/historico.py                 # registra cambios vs. último snapshot y regenera la serie
    python3 dataset/scripts/historico.py --fecha 2026-09-30   # fecha del evento si se conoce
    python3 dataset/scripts/historico.py --mensual       # igual, y guarda siempre el snapshot (workflow del día 1)
    python3 dataset/scripts/historico.py --reconstruir   # rehace cambios.json comparando snapshots consecutivos
    python3 dataset/scripts/historico.py --dry-run

Debe ejecutarse DESPUÉS de export.py.
"""

import argparse, glob, json, os, re
from datetime import date
import openpyxl

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.dirname(SCRIPT_DIR)
ROOT_DIR    = os.path.dirname(DATASET_DIR)
XLSX        = os.path.join(DATASET_DIR, "datosfinales.xlsx")
HIST_DIR    = os.path.join(DATASET_DIR, "historical")
CAMBIOS     = os.path.join(HIST_DIR, "cambios.json")
SERIE       = os.path.join(ROOT_DIR, "src", "data", "historico.json")
LAST_UPDATE = os.path.join(ROOT_DIR, "src", "data", "lastUpdate.json")

# Categorías cuyas altas/bajas son un hecho real (cambia la composición).
# En el resto, también se registran, pero son más ruido de inventario que política.
CAT_PERSONAS = {"Gobierno", "Congreso", "Senado"}

SNAP_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.json$")


def fecha_str(val):
    if val is None: return None
    s = str(val).strip()
    m = re.match(r"^\d{4}-\d{2}-\d{2}", s)
    return m.group(0) if m else None


def activo(fecha, ref):
    if not fecha or not ref: return False
    from datetime import datetime, timedelta
    try:
        d = datetime.strptime(fecha, "%Y-%m-%d").date()
        r = datetime.strptime(ref, "%Y-%m-%d").date()
    except ValueError:
        return False
    return r - timedelta(days=30) <= d <= r


def snapshot_desde_xlsx():
    """Estado actual completo, con los campos que identifican el puesto."""
    refs = {}
    try:
        refs = json.load(open(LAST_UPDATE, encoding="utf-8"))
    except Exception:
        pass
    ws = openpyxl.load_workbook(XLSX, data_only=True)["Sheet1"]
    out = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        cat, nombre = r[0], r[1]
        if not cat or not nombre: continue
        tw, tw_f, bs, bs_f, md, md_f = r[2], fecha_str(r[3]), r[4], fecha_str(r[5]), r[6], fecha_str(r[7])
        detalle, tipo, grupo, circ, ccaa, invente = r[9], r[10], r[11], r[12], r[13], r[15]
        pds = r[23] if len(r) > 23 else None   # PDS resuelto por DID (resolve_pds.py)
        out.append({
            "categoria": cat,
            "subcategoria": (detalle or tipo) and str(detalle or tipo).strip() or None,
            "nombre": str(nombre).strip(),
            "grupo": grupo or None, "circunscripcion": circ or None,
            "ccaa": ccaa or None, "invente": invente or None,
            "twitter": tw or None, "twitter_activo": activo(tw_f, refs.get("twitter")), "twitter_fecha": tw_f,
            "bluesky": bs or None, "bluesky_pds": pds or None, "bluesky_activo": activo(bs_f, refs.get("bluesky")), "bluesky_fecha": bs_f,
            "mastodon": md or None, "mastodon_activo": activo(md_f, refs.get("mastodon")), "mastodon_fecha": md_f,
        })
    return out


def snapshots_guardados():
    """[(fecha, ruta)] ordenados por fecha."""
    res = []
    for p in glob.glob(os.path.join(HIST_DIR, "*.json")):
        m = SNAP_RE.match(os.path.basename(p))
        if m: res.append((m.group(1), p))
    return sorted(res)


def cargar(path):
    with open(path, encoding="utf-8") as f: return json.load(f)


def indexar(snap):
    return {(x["categoria"], x["nombre"]): x for x in snap}


def eventos_entre(prev, cur, fecha, precision):
    """Altas, bajas y cambios de cargo/grupo entre dos estados."""
    P, C = indexar(prev), indexar(cur)
    cats_prev = {k[0] for k in P}
    ev = []
    for k in sorted(set(P) | set(C)):
        cat, nombre = k
        if cat not in cats_prev:
            # Categoría nueva en el dataset: ampliación de cobertura, no altas reales.
            if k in C and not any(e["categoria"] == cat and e["evento"] == "cobertura" for e in ev):
                ev.append({"fecha": fecha, "precision": precision, "categoria": cat,
                           "nombre": None, "evento": "cobertura",
                           "detalle": "La categoría se incorpora al dataset"})
            continue
        if k not in C:
            ev.append({"fecha": fecha, "precision": precision, "categoria": cat, "nombre": nombre,
                       "evento": "baja", "detalle": P[k].get("subcategoria") or P[k].get("grupo")})
        elif k not in P:
            ev.append({"fecha": fecha, "precision": precision, "categoria": cat, "nombre": nombre,
                       "evento": "alta", "detalle": C[k].get("subcategoria") or C[k].get("grupo")})
        else:
            a, b = P[k], C[k]
            if cat == "Gobierno" and a.get("subcategoria") != b.get("subcategoria"):
                ev.append({"fecha": fecha, "precision": precision, "categoria": cat, "nombre": nombre,
                           "evento": "cargo", "detalle": f'{a.get("subcategoria")} → {b.get("subcategoria")}'})
            # grupo solo existe en snapshots enriquecidos
            if a.get("grupo") and b.get("grupo") and a["grupo"] != b["grupo"]:
                ev.append({"fecha": fecha, "precision": precision, "categoria": cat, "nombre": nombre,
                           "evento": "grupo", "detalle": f'{a["grupo"]} → {b["grupo"]}'})
    # Una ampliación masiva de una categoría ya existente (p. ej. importar el
    # Invente completo) es cobertura, no 300 altas reales de personas u organismos.
    por_cat = {}
    for e in ev:
        if e["evento"] == "alta": por_cat.setdefault(e["categoria"], []).append(e)
    n_prev = {c: sum(1 for k in P if k[0] == c) for c in cats_prev}
    for cat, altas in por_cat.items():
        if len(altas) > max(20, 0.5 * n_prev.get(cat, 0)):
            ev = [e for e in ev if not (e["evento"] == "alta" and e["categoria"] == cat)]
            ev.append({"fecha": fecha, "precision": precision, "categoria": cat, "nombre": None,
                       "evento": "cobertura", "detalle": f"Ampliación de cobertura: +{len(altas)} entidades"})
    return ev


def clave(e):
    return (e["fecha"], e["categoria"], e.get("nombre"), e["evento"])


def fusionar(existentes, nuevos):
    vistos = {clave(e) for e in existentes}
    res = list(existentes) + [e for e in nuevos if clave(e) not in vistos]
    return sorted(res, key=lambda e: (e["fecha"], e["categoria"], e.get("nombre") or "", e["evento"]))


def es_eurosky(handle, pds=None):
    """Eurosky se decide por el PDS del DID; el handle solo vale como respaldo."""
    if pds: return pds == "eurosky.social" or pds.endswith(".eurosky.social")
    return bool(handle) and handle.lower().endswith(".eurosky.social")


def agregar(snap):
    cats = {}
    for x in snap:
        c = cats.setdefault(x["categoria"], dict(entidades=0, twitter=0, twitter_activo=0,
                            bluesky=0, bluesky_activo=0, mastodon=0, mastodon_activo=0, eurosky=0))
        c["entidades"] += 1
        for p in ("twitter", "bluesky", "mastodon"):
            if x.get(p): c[p] += 1
            if x.get(p + "_activo"): c[p + "_activo"] += 1
        if es_eurosky(x.get("bluesky"), x.get("bluesky_pds")): c["eurosky"] += 1
    return cats


def construir_serie(cambios, actual_fecha, actual):
    serie = []
    vistos = set()
    for f, p in snapshots_guardados():
        snap = cargar(p)
        serie.append({"fecha": f, "categorias": agregar(snap)})
        vistos.add(f)
    if actual_fecha not in vistos:
        serie.append({"fecha": actual_fecha, "categorias": agregar(actual)})
    serie.sort(key=lambda s: s["fecha"])
    return {"generado": actual_fecha, "serie": serie, "cambios": cambios}


def escribir(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fecha", help="Fecha (YYYY-MM-DD) de los cambios detectados; por defecto hoy")
    ap.add_argument("--reconstruir", action="store_true", help="Rehace cambios.json comparando todos los snapshots")
    ap.add_argument("--mensual", action="store_true", help="Guarda siempre el snapshot de la fecha (uso del workflow mensual)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    hoy = args.fecha or date.today().isoformat()

    actual = snapshot_desde_xlsx()
    guardados = snapshots_guardados()

    if args.reconstruir:
        cambios = []
        for (f0, p0), (f1, p1) in zip(guardados, guardados[1:]):
            cambios = fusionar(cambios, eventos_entre(cargar(p0), cargar(p1), f1, "mensual"))
        base = guardados[-1] if guardados else None
    else:
        cambios = cargar(CAMBIOS) if os.path.exists(CAMBIOS) else []
        base = guardados[-1] if guardados else None

    nuevos = eventos_entre(cargar(base[1]), actual, hoy, "deteccion") if base else []
    # Si el snapshot base es del mismo día, los cambios ya estaban reflejados en él.
    if base and base[0] == hoy:
        nuevos = []
    cambios = fusionar(cambios, nuevos)

    print(f"Snapshots guardados: {len(guardados)} (último: {base[0] if base else '—'})")
    print(f"Eventos nuevos: {len(nuevos)}")
    for e in nuevos:
        print(f"  {e['evento']:9} {e['categoria']:10} {e.get('nombre') or '—'}  {e.get('detalle') or ''}")

    if args.dry_run:
        print("\nDRY-RUN: no se escribe nada."); return

    os.makedirs(HIST_DIR, exist_ok=True)
    escribir(CAMBIOS, cambios)
    # Snapshot intermedio solo si hay cambios en la composición y no existe ya uno para esa fecha.
    ruta_hoy = os.path.join(HIST_DIR, f"{hoy}.json")
    if (nuevos or args.mensual) and (args.mensual or not os.path.exists(ruta_hoy)):
        escribir(ruta_hoy, actual)
        print(f"Snapshot guardado: {ruta_hoy}")
    escribir(SERIE, construir_serie(cambios, hoy, actual))
    print(f"Escrito {CAMBIOS} y {SERIE}")


if __name__ == "__main__":
    main()
