#!/bin/bash
set -e

VENV=".venv"

if [ ! -d "$VENV" ]; then
  echo "Creando entorno virtual en $VENV..."
  python3 -m venv "$VENV"
fi

echo "Instalando dependencias Python..."
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -r dataset/requirements.txt

echo ""
echo "Listo. Scripts disponibles:"
echo "  npm run export          — genera los JSON desde datosfinales.xlsx"
echo "  npm run export:dry      — vista previa sin escribir"
echo "  npm run check:free      — actualiza fechas de Bluesky y Mastodon"
echo "  npm run check:twitter   — actualiza fechas de Twitter (requiere token)"
