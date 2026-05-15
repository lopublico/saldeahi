#!/usr/bin/env python3
"""
main.py — Punto de entrada interactivo para la gestión del dataset de saldeahi.

Uso:
    python3 dataset/scripts/main.py
    python3 dataset/scripts/main.py --no-venv   # si ya tienes el entorno activo
"""

import os
import sys
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR   = os.path.dirname(os.path.dirname(SCRIPT_DIR))   # raíz del proyecto
DATASET_DIR = os.path.dirname(SCRIPT_DIR)

def run(script, *args, confirm_cost=False):
    if confirm_cost:
        print()
        print("  ⚠️  Esta operación consume tokens de la API de Twitter (GetXAPI).")
        print("     Cada llamada tiene coste. ¿Continuar? [s/N] ", end="", flush=True)
        r = input().strip().lower()
        if r not in ("s", "si", "sí", "y", "yes"):
            print("  Cancelado.")
            return
    path = os.path.join(SCRIPT_DIR, script)
    cmd = [sys.executable, path] + list(args)
    subprocess.run(cmd, cwd=ROOT_DIR)

def backup():
    sys.path.insert(0, SCRIPT_DIR)
    from backup import backup_datosfinales
    backup_datosfinales()

MENU = [
    ("Exportar JSON para la web (src/data/)",        lambda: run("export.py")),
    ("Exportar JSON — dry-run (solo preview)",        lambda: run("export.py", "--dry-run")),
    ("---", None),
    ("Comprobar actividad Bluesky  [gratis]",         lambda: run("check_activity.py", "--bluesky")),
    ("Comprobar actividad Mastodon [gratis]",         lambda: run("check_activity.py", "--mastodon")),
    ("Comprobar actividad Twitter  [⚠️  coste API]",  lambda: run("check_activity.py", "--twitter", confirm_cost=True)),
    ("---", None),
    ("Inferir Bluesky via seguidos [gratis]",         lambda: run("infer_social.py", "--bluesky")),
    ("Inferir Twitter via seguidos [⚠️  coste API]",  lambda: run("infer_social.py", "--twitter", confirm_cost=True)),
    ("Verificar handles Bluesky (bio/posts) [gratis]",lambda: run("infer_social.py", "--verify-bsky")),
    ("---", None),
    ("Actualizar cámara (Congreso/Senado tras elecciones)", lambda: run("update_chamber.py")),
    ("---", None),
    ("Hacer copia de seguridad ahora",               backup),
    ("Salir",                                        None),
]

def main():
    print()
    print("╔══════════════════════════════════════╗")
    print("║   saldeahi — Gestión del dataset     ║")
    print("╚══════════════════════════════════════╝")

    while True:
        print()
        idx = 1
        display = []
        for label, fn in MENU:
            if label == "---":
                print("  ─────────────────────────────────────")
                display.append(None)
            else:
                print(f"  {idx:2d}. {label}")
                display.append((label, fn))
                idx += 1
        print()
        print("  Elige una opción: ", end="", flush=True)

        try:
            choice = input().strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Saliendo.")
            break

        try:
            n = int(choice)
        except ValueError:
            print("  Opción no válida.")
            continue

        # Map number to action (skipping separators)
        numbered = [(i+1, label, fn) for i, (label, fn) in enumerate(
            [(l, f) for l, f in MENU if l != "---"]
        )]

        match = next((fn for num, label, fn in numbered if num == n), None)
        if match is None:
            # Last item is "Salir"
            if n == len(numbered):
                print("  Hasta luego.")
                break
            print("  Opción no válida.")
            continue

        label_match = next((label for num, label, fn in numbered if num == n), "")
        if label_match == "Salir":
            print("  Hasta luego.")
            break

        print()
        match()

if __name__ == "__main__":
    main()
