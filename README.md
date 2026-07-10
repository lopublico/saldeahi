![sal de ahí](public/og-image.png)

# sal de ahí

Directorio de instituciones públicas españolas y su presencia en redes sociales. Registra qué organismos siguen activos en X/Twitter y cuáles han abierto cuentas en alternativas federadas como Bluesky o Mastodon.

**→ [saldeahi.es](https://saldeahi.es)**

---

## Cobertura

| Categoría | Descripción |
|-----------|-------------|
| Administración General del Estado | Ministerios, secretarías de Estado, delegaciones del Gobierno, Fuerzas Armadas y cuerpos de seguridad, y el sector público institucional estatal completo según el Inventario de Entes (Invente/IGAE): organismos autónomos, agencias, autoridades independientes, EPEs, entidades gestoras de la S.S., fundaciones y sociedades mercantiles estatales (matrices) |
| Órganos del Estado | Casa Real, Tribunal Constitucional, CGPJ, Fiscalía, Defensor del Pueblo, Tribunal de Cuentas y otros órganos constitucionales |
| Gobierno | Presidente y ministros en activo |
| Congreso de los Diputados | Institución, grupos parlamentarios y diputados/as |
| Senado | Institución, grupos parlamentarios y senadores/as |
| Partidos políticos | Cuentas orgánicas de partidos con representación en el Congreso |
| Autonomías | Presidencias, gobiernos y asambleas legislativas de las 17 comunidades autónomas |
| Organismos autonómicos | Entes públicos, agencias, entidades públicas empresariales y organismos autónomos de las 17 CCAA y Ceuta/Melilla, según el Invente (radiotelevisiones autonómicas, agencias tributarias regionales, servicios de aguas, etc.) |
| Universidades | Centros reconocidos por el Ministerio de Universidades |

---

## Estructura del proyecto

```
saldeahi/
├── src/
│   ├── components/         # Componentes React (AppSection, ReportModal…)
│   ├── data/               # JSONs generados por export.py (no editar a mano)
│   ├── layouts/            # Layout base de Astro
│   ├── pages/              # index.astro, porque.astro, datos.astro
│   └── styles/             # global.css (Tailwind v4)
├── dataset/
│   ├── datosfinales.xlsx        # Fuente de verdad única — handles y fechas de actividad
│   ├── historical/              # Snapshot mensual de total.json (un fichero por mes)
│   └── scripts/
│       ├── main.py              # Menú interactivo (punto de entrada único)
│       ├── backup.py            # Módulo de copia de seguridad (llamado automáticamente)
│       ├── export.py            # datosfinales.xlsx → src/data/*.json
│       ├── check_activity.py    # Comprueba últimas publicaciones por plataforma
│       ├── infer_social.py      # Infiere handles nuevos via follows + fuzzy match
│       ├── update_chamber.py    # Actualiza Congreso/Senado tras elecciones
│       └── audit_invente.py     # Audita formas jurídicas y altas/bajas contra la API de Invente (IGAE)
├── netlify/
│   └── functions/
│       └── report.js            # Procesa reportes de ciudadanos → GitHub Issue
├── public/                 # Favicon, og-image…
├── netlify.toml            # Build command de Netlify
└── package.json
```

---

## Instalación

### Web

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # Genera dist/
```

### Scripts de dataset

Requieren Python 3.9+ y las dependencias en `dataset/requirements.txt`:

```bash
pip install -r dataset/requirements.txt
```

---

## Flujo de datos

```
datosfinales.xlsx
      │
      ├── check_activity.py  →  actualiza columnas *_Activo + lastUpdate.json
      │
      ├── infer_social.py    →  propone handles nuevos (requiere revisión manual)
      │
      └── export.py          →  src/data/*.json  →  build Astro  →  dist/
```

`datosfinales.xlsx` es la **única fuente de verdad**. Todos los scripts crean una copia en `dataset/backups/datosfinales_YYYY-MM-DD.xlsx` antes de modificarla.

### Columnas de datosfinales.xlsx

| Col | Campo | Descripción |
|-----|-------|-------------|
| A | Categoría | AGE / Órganos del Estado / Gobierno / Congreso / Senado / Partidos / Autonomías / Universidades |
| B | Nombre | Nombre oficial de la entidad |
| C | Twitter | Handle sin @ (ej. `MAECgob`) |
| D | Twitter Activo | Fecha de última publicación o `404` si la cuenta no existe |
| E | Bluesky | Handle cualificado (ej. `maec.bsky.social`) |
| F | BS Activo | Fecha de última publicación en Bluesky |
| G | Mastodon | Handle completo (ej. `user@mastodon.social`) |
| H | MD Activo | Fecha de última publicación en Mastodon |
| I | Email | Email de contacto público |
| J | Detalle | Cargo o descripción |
| K | Tipo | Subtipo (Diputado/a, Senador/a, Presidencia…) |
| L | Grupo | Grupo parlamentario |
| M | Circunscripción | Provincia de elección |
| N | CCAA | Comunidad autónoma |
| O | Partido | Partido político |
| P | Invente | Código del ente en el Inventario de Entes del Sector Público (IGAE), para sincronizar altas/bajas con la API de Invente |

---

## Uso habitual

### Menú interactivo

```bash
python3 dataset/scripts/main.py
```

```
1.  Exportar JSON para la web                (gratis)
2.  Exportar JSON — dry-run                  (gratis)
──────────────────────────────────────────────────────
3.  Comprobar actividad Bluesky              (gratis)
4.  Comprobar actividad Mastodon             (gratis)
5.  Comprobar actividad Twitter              (⚠️ ~0,001 €/petición)
──────────────────────────────────────────────────────
6.  Inferir Bluesky via seguidos             (gratis)
7.  Inferir Twitter via seguidos             (⚠️ coste API)
8.  Verificar handles Bluesky                (gratis)
──────────────────────────────────────────────────────
9.  Actualizar cámara (Congreso/Senado)      (gratis)
──────────────────────────────────────────────────────
10. Copia de seguridad                       (gratis)
```

Las opciones con coste piden confirmación explícita.

### Actualización mensual (manual)

```bash
python3 dataset/scripts/main.py
# → 3: Bluesky   (gratis)
# → 4: Mastodon  (gratis)
# → 1: Exportar JSON
git add dataset/ src/data/
git commit -m "datos: actualización mensual"
git push
```

Twitter se actualiza a criterio (coste por petición). El dataset tiene 1.395 entidades, de las cuales ~1.107 tienen cuenta en X; una comprobación completa de todas ellas cuesta aprox. **1,10 €**.

---

## Despliegue y actualización automática

El sitio se despliega en **Netlify** desde la rama `main`.

### Qué ocurre en cada build

El comando de build de Netlify regenera los JSON y construye el sitio:

```
pip install → export.py → npm run build
```

Los checks de actividad (Bluesky, Mastodon, Twitter) **no** se ejecutan en el build: los gestiona GitHub Actions el día 1 de cada mes (ver abajo). Netlify solo construye a partir de los JSON ya actualizados.

### Actualización automática mensual

El workflow `.github/workflows/actualizacion-mensual.yml` se ejecuta el **día 1 de cada mes a las 5:00 UTC**:

1. Comprueba actividad en Bluesky, Mastodon y Twitter/X
2. Regenera `src/data/*.json` con `export.py`
3. Guarda un snapshot histórico en `dataset/historical/YYYY-MM-01.json`
4. Commitea y hace push — lo que dispara el rebuild de Netlify

Al terminar, el workflow `.github/workflows/zenodo-publish.yml` publica automáticamente una nueva versión del dataset en Zenodo.

---

## Actualización tras elecciones

### 1. Descargar datos oficiales

- **Senado:** <https://www.senado.es/web/relacionesciudadanos/datosabiertos/> → XML
- **Congreso:** <https://www.congreso.es/en/datos-abiertos> → CSV

### 2. Detectar bajas y altas

```bash
python3 dataset/scripts/update_chamber.py --camara senado --xml senado.xml --dry-run
python3 dataset/scripts/update_chamber.py --camara congreso --csv diputados.csv --dry-run
```

Quitar `--dry-run` para aplicar. El script crea backup automático antes de modificar.

### 3. Inferir handles de nuevos parlamentarios

```bash
python3 dataset/scripts/infer_social.py --bluesky        # gratis
python3 dataset/scripts/infer_social.py --apply          # aplica sugerencias de alta confianza
python3 dataset/scripts/infer_social.py --twitter        # ⚠️ coste API
```

Las propuestas se guardan en `dataset/data/suggestions.json` con nivel de confianza (Alta/Media/Baja) antes de aplicarse.

### 4. Exportar y desplegar

```bash
python3 dataset/scripts/export.py
git add dataset/ src/data/
git commit -m "cámaras: actualización tras elecciones"
git push
```

---

## Criterios de calidad de handles

### Bluesky — verificación gratuita

Verificación mediante `public.api.bsky.app` (sin autenticación):

| Nivel | Criterio |
|-------|----------|
| Alta | Nombre de display contiene todos los apellidos y el nombre, o el nombre institucional oficial |
| Media | Contiene dos apellidos, o un apellido + nombre; contenido coherente con el cargo |
| Baja | Un solo apellido — **no se incluye en el dataset** |

### Twitter/X — verificación de pago (GetXAPI)

Mismos criterios de confianza. Token configurado via variable de entorno `GETXAPI_TOKEN` o argumento `--token`.

```bash
export GETXAPI_TOKEN="tu_token"
python3 dataset/scripts/check_activity.py --twitter
```

---

## Copias de seguridad

Antes de cualquier modificación automatizada del Excel se crea una copia en `dataset/backups/datosfinales_YYYY-MM-DD.xlsx`. También manualmente:

```bash
python3 dataset/scripts/backup.py
```

Estas copias son **locales** (gitignored, no se versionan en el repo). El historial de versiones queda cubierto por: el historial de git de `datosfinales.xlsx`, los snapshots mensuales en `dataset/historical/` y las versiones publicadas en Zenodo.

---

## Reportes de ciudadanos

Cualquier persona puede reportar un dato incorrecto directamente desde la web: el icono de bandera en cada fila abre un formulario que crea un issue en GitHub automáticamente.

Variables de entorno necesarias en Netlify:
- `RECAPTCHA_SECRET` — secret key de reCAPTCHA v3
- `GITHUB_TOKEN` — token con permiso `issues:write`
- `GITHUB_REPO` — `usuario/repo`
- `PUBLIC_RECAPTCHA_SITE_KEY` — site key pública (incluida en el build)

---

## Licencia

Los datos son de fuentes públicas. El código es MIT.
