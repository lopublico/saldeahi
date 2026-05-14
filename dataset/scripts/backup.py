#!/usr/bin/env python3
"""
backup.py — Copia datosfinales.xlsx a dataset/backups/ con fecha.

Se llama automáticamente al inicio de cualquier script que modifique
datosfinales.xlsx (check_activity, infer_social, update_chamber).
Si ya existe una copia del día de hoy, la sobreescribe.
"""
import os, shutil
from datetime import date

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.dirname(SCRIPT_DIR)
DF_FILE     = os.path.join(DATASET_DIR, "datosfinales.xlsx")
BACKUPS_DIR = os.path.join(DATASET_DIR, "backups")


def backup_datosfinales():
    if not os.path.exists(DF_FILE):
        print("AVISO: datosfinales.xlsx no encontrado, no se crea copia.")
        return
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    today = date.today().isoformat()
    dst = os.path.join(BACKUPS_DIR, f"datosfinales_{today}.xlsx")
    shutil.copy2(DF_FILE, dst)
    print(f"Copia de seguridad: dataset/backups/datosfinales_{today}.xlsx")


if __name__ == "__main__":
    backup_datosfinales()
