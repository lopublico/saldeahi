![sal de ahí](public/og-image.png)

# sal de ahí

Directorio de instituciones públicas españolas y su presencia en redes sociales descentralizadas. Registra qué organismos siguen en X/Twitter y cuáles han abierto cuentas en alternativas como Bluesky o Mastodon.

**→ [saldeahi.es](https://saldeahi.es)**

---

## Contenido

- Administración General del Estado (ministerios, organismos autónomos, empresas públicas)
- Gobierno de España (presidente y ministros)
- Congreso de los Diputados y Senado
- Comunidades autónomas (parlamentos, gobiernos y presidentes)
- Partidos políticos con representación parlamentaria
- Universidades públicas

---

## Estructura del proyecto

```
saldeahiweb/
├── src/
│   ├── components/         # Componentes React (tabla, barras, filtros...)
│   ├── data/               # JSONs generados por export.py (no editar a mano)
│   ├── layouts/            # Layout base de Astro
│   ├── pages/              # index.astro, porque.astro, datos.astro
│   └── styles/             # global.css (Tailwind v4)
├── dataset/
│   ├── confidence_report.xlsx   # Fuente de verdad con índices de confianza
│   ├── datosfinales.xlsx        # Datos limpios que consume la web
│   ├── backups/                 # Copias de seguridad con fecha
│   ├── data/                    # Cachés de API (bsky_follows.json, etc.)
│   └── scripts/
│       ├── main.py              # Menú interactivo (punto de entrada único)
│       ├── export.py            # datosfinales.xlsx → src/data/*.json
│       ├── sync.py              # confidence_report → datosfinales
│       ├── check_activity.py    # Comprueba últimas publicaciones
│       ├── infer_social.py      # Infiere handles via follows/búsqueda
│       └── update_chamber.py   # Actualiza cámaras tras elecciones
├── public/                 # Favicon, og-image...
└── package.json
```

---

## Instalación

### Plataforma web

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # Genera dist/
npm run preview    # Sirve dist/ localmente
```

### Scripts de dataset

Requieren Python 3.9+ y `openpyxl`:

```bash
pip install openpyxl
```

---

## Flujo de datos

```
confidence_report.xlsx   ←  revisión manual + infer_social.py
        │
        │  sync.py
        ▼
datosfinales.xlsx        ←  check_activity.py (fechas de último uso)
        │
        │  export.py
        ▼
src/data/*.json          ←  consumidos por la web Astro
```

### Archivos Excel

**`dataset/confidence_report.xlsx`** — Fuente de verdad para revisión de handles.

| Col | Campo | Descripción |
|-----|-------|-------------|
| A | Categoría | AGE, Congreso, Senado, Gobierno, Autonomías, Partidos, Universidades |
| B | Nombre | Nombre oficial de la entidad |
| C | Partido/Grupo | Grupo parlamentario o partido |
| D | Twitter | Handle de X/Twitter |
| E | Bluesky | Handle de Bluesky |
| F | Mastodon | Handle de Mastodon |
| G | Confianza | Alta / Media / Baja (confianza en el handle) |
| H | Última actividad | Fecha de último post detectado |
| I | Señales | Notas de la verificación manual |
| J | BS Display Name | Nombre real en Bluesky (para verificación) |
| K | BS Confianza | Confianza específica del handle de Bluesky |
| L | TW Display Name | Nombre real en Twitter/X |
| M | TW Confianza DN | Confianza del handle de Twitter |

**`dataset/datosfinales.xlsx`** — Fuente que consume la web. Solo columnas esenciales.

| Col | Campo | Descripción |
|-----|-------|-------------|
| A | Categoría | Igual que CR |
| B | Nombre | Nombre oficial |
| C | Twitter | Handle de X/Twitter |
| D | Twitter Activo | Fecha de última publicación o "404" |
| E | Bluesky | Handle de Bluesky |
| F | BS Activo | Fecha de última publicación |
| G | Mastodon | Handle de Mastodon |
| H | MD Activo | Fecha de última publicación |
| I | Email | Email de contacto público |
| J | Detalle | Cargo o descripción |
| K | Tipo | Subtipo (diputado, senador, presidente...) |
| L | Grupo | Grupo parlamentario |
| M | Circunscripción | Provincia de elección |
| N | CCAA | Comunidad autónoma |
| O | Partido | Partido político |

---

## Uso habitual

### Menú interactivo (recomendado)

```bash
python3 dataset/scripts/main.py
# o bien:
npm run dataset
```

El menú ofrece:

```
1. Exportar JSON para la web              (gratis)
2. Comprobar actividad Bluesky/Mastodon   (gratis)
3. Comprobar actividad Twitter            (⚠️ coste API)
4. Inferir Bluesky via follows            (gratis)
5. Inferir Twitter via follows            (⚠️ coste API)
6. Verificar handles de Bluesky          (gratis)
7. Actualizar cámara (tras elecciones)   (gratis)
8. Sincronizar CR → datosfinales         (gratis)
9. Copia de seguridad                    (gratis)
```

Las opciones que usan la API de Twitter/GetXAPI piden confirmación explícita antes de ejecutarse.

### Flujo mensual recomendado

```bash
python3 dataset/scripts/main.py
# 2 → Comprobar actividad Bluesky/Mastodon
# 8 → Sincronizar CR → datosfinales
# 1 → Exportar JSON
npm run build
```

### Exportación directa

```bash
npm run export        # Escribe src/data/*.json desde datosfinales.xlsx
npm run export:dry    # Muestra recuento sin escribir nada
```

---

## Actualización tras elecciones

Cuando cambia la composición de una cámara:

### 1. Descargar datos oficiales

**Senado:** <https://www.senado.es/web/relacionesciudadanos/datosabiertos/catalogodatos/index.html>
→ "Composición del Senado" → XML

**Congreso:** <https://www.congreso.es/en/datos-abiertos>
→ Diputados del Congreso → CSV

### 2. Detectar bajas y altas

```bash
python3 dataset/scripts/update_chamber.py --camara senado --xml /ruta/senado.xml --dry-run
python3 dataset/scripts/update_chamber.py --camara congreso --csv /ruta/diputados.csv --dry-run
```

Muestra los cambios detectados sin modificar nada. Quitar `--dry-run` para aplicar.

### 3. Buscar handles de los nuevos diputados/senadores

```bash
python3 dataset/scripts/infer_social.py --bluesky    # Gratis — infiere via follows de cuentas semilla
python3 dataset/scripts/infer_social.py --twitter    # ⚠️ Coste API — pide confirmación
```

Las cuentas semilla para la inferencia son:
- Bluesky: `gpssenado.bsky.social`, `gpscongreso.bsky.social`
- Twitter: `GPSSenado`, `GPSCongreso`, `GPPopular`, `PPSenado`

Los handles propuestos se muestran con su nivel de confianza (Alta/Media/Baja) y requieren confirmación manual antes de aplicarse.

### 4. Verificar handles nuevos de Bluesky

```bash
python3 dataset/scripts/infer_social.py --verify-bsky
```

Usa la API pública gratuita de Bluesky para confirmar que cada handle existe y que el nombre del perfil coincide con el parlamentario.

### 5. Sincronizar y exportar

```bash
python3 dataset/scripts/sync.py       # CR → datosfinales
python3 dataset/scripts/export.py     # datosfinales → src/data/*.json
npm run build
```

---

## Criterios de calidad de los handles

### Bluesky (verificación gratuita)

Todos los handles de Bluesky se verifican mediante la API pública (`public.api.bsky.app`), que no requiere autenticación ni tiene coste:

- Se confirma que la cuenta existe y no está suspendida
- Se comprueba que el `displayName` o la bio contienen el nombre del parlamentario
- Si la bio está vacía, se comprueban los últimos posts

Niveles de confianza:
- **Alta**: todos los apellidos + nombre coinciden con el perfil
- **Media**: dos apellidos O un apellido + nombre coinciden
- **Baja**: solo un apellido coincide (requiere revisión adicional)

### Twitter/X (verificación de pago)

La verificación de Twitter usa GetXAPI (<https://getxapi.com>), que cobra por petición. Se aplican las mismas reglas de confianza. Solo se verifican candidatos propuestos por el sistema de inferencia, no el conjunto completo.

Configurar el token:

```bash
export GETXAPI_TOKEN="tu_token_aqui"
# o bien pasarlo como argumento:
python3 dataset/scripts/check_activity.py --twitter --token TU_TOKEN
```

### Coste estimado de las operaciones

| Operación | Plataforma | Coste |
|-----------|------------|-------|
| Comprobar actividad | Bluesky | Gratis |
| Comprobar actividad | Mastodon | Gratis |
| Comprobar actividad | Twitter | ~0,001 €/petición (GetXAPI) |
| Inferir handles via follows | Bluesky | Gratis |
| Inferir handles via follows | Twitter | ~0,01 €/operación (GetXAPI) |
| Verificar handle individual | Bluesky | Gratis |
| Verificar handle individual | Twitter | ~0,001 €/petición |

Con ~820 entradas, una comprobación completa de actividad en Twitter cuesta aproximadamente **0,82 €**.

---

## Copias de seguridad

```bash
python3 dataset/scripts/main.py
# → Opción 9: Copia de seguridad
```

Se guardan en `dataset/backups/` con nombre `confidence_report_YYYY-MM-DD.xlsx` y `datosfinales_YYYY-MM-DD.xlsx`.

---

## Colaboración

Si detectas un dato incorrecto o que falta una cuenta, puedes proponer una corrección directamente desde la web: al pasar el ratón sobre cualquier fila de la tabla aparece un icono de bandera que abre un formulario de reporte.

También puedes [abrir un issue manualmente](https://github.com/avelrom/saldeahi/issues/new).

---

## Licencia

Los datos son de fuentes públicas. El código es MIT.
