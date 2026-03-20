![sal de ahí](public/og-image.png)

# sal de ahí

Directorio de instituciones públicas españolas y su presencia en redes sociales. Registra qué organismos siguen en X/Twitter y cuáles han abierto cuentas en alternativas federadas como Bluesky o Mastodon.

**→ [saldeahi.es](https://saldeahi.es)**

---

## Qué incluye

- Administración General del Estado (ministerios, organismos autónomos, empresas públicas)
- Gobierno de España (presidente y ministros)
- Congreso de los Diputados y Senado
- Comunidades autónomas (parlamentos, gobiernos y presidentes)
- Partidos políticos con representación parlamentaria
- Universidades públicas

---

## Desarrollo local

```bash
npm install
npm run dev
```

La web arranca en `http://localhost:4321`.

```bash
npm run build    # genera el sitio estático en dist/
npm run preview  # sirve dist/ localmente
```

---

## Gestión de datos

Los datos viven en `datosfinales.xlsx` y se exportan a `src/data/*.json` mediante scripts de Python.

### Primera vez

```bash
npm run setup
```

Crea el entorno virtual `.venv` e instala las dependencias de Python (`openpyxl`, etc.).

### Flujo habitual de actualización

```bash
# 1. Actualizar fechas de actividad en Bluesky y Mastodon (sin coste)
npm run check:free

# 2. Actualizar fechas de actividad en Twitter/X (requiere token de GetXAPI)
npm run check:twitter -- --token TU_API_KEY

# 3. Volcar el Excel a los archivos JSON que usa la web
npm run export

# 4. Construir y desplegar
npm run build
```

Los scripts `check:free` y `check:twitter`:
- Modifican `datosfinales.xlsx` con las fechas de última publicación detectada.
- Escriben automáticamente `src/data/lastUpdate.json` con la fecha del día (UTC). Este archivo es el que alimenta el texto "Última actualización" del pie de página.

`export` lee el Excel y sobreescribe los JSON en `src/data/`. `build` genera el sitio estático incluyendo la fecha actualizada en el footer.

```bash
# Opcionalmente, hacer un dry-run de la exportación sin escribir ficheros
npm run export:dry
```

> **Nota:** las barras de progreso muestran "activo" para cuentas con actividad en los últimos 30 días. Si los datos no se actualizan en ese plazo, los contadores de "activos" se ponen a cero aunque la cuenta exista.

### Estructura de los datos

Cada entrada en el Excel/JSON tiene esta forma:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | string | Nombre de la entidad |
| `twitter` | string \| null | Handle de X/Twitter (sin @) |
| `twitter_activo` | fecha \| `"404"` \| null | Última publicación detectada, `"404"` si la cuenta no existe |
| `bluesky` | string \| null | Handle de Bluesky |
| `bluesky_activo` | fecha \| null | Última publicación detectada |
| `mastodon` | string \| null | URL completa del perfil de Mastodon |
| `mastodon_activo` | fecha \| null | Última publicación detectada |
| `email` | string \| null | Email de contacto público |

### Formatear el Excel

Si el Excel tiene filas con formato inconsistente (fechas como texto, etc.):

```bash
npm run format:xlsx
```

---

## Estructura del proyecto

```
saldeahiweb/
├── src/
│   ├── components/      # Componentes React (tabla, barras, filtros...)
│   ├── data/            # JSONs generados (no editar a mano)
│   ├── layouts/         # Layout base de Astro
│   ├── pages/           # index.astro, porque.astro
│   └── styles/          # global.css (Tailwind v4 + tokens)
├── parsers/             # Scripts Python de actualización
│   ├── export_json.py   # Excel → JSON
│   ├── check_free.py    # Comprueba actividad en Bluesky/Mastodon
│   ├── check_twitter.py # Comprueba actividad en X (requiere API)
│   └── format_xlsx.py   # Normaliza formato del Excel
├── datosfinales.xlsx    # Fuente de verdad de los datos
└── public/              # Favicon, og-image...
```

---

## Colaboración

Si detectas un dato incorrecto o que falta una cuenta, puedes proponer una corrección directamente desde la web: al pasar el ratón sobre cualquier fila de la tabla aparece un icono de bandera que abre un issue en GitHub con los datos actuales pre-rellenados.

También puedes [abrir un issue manualmente](https://github.com/avelrom/saldeahi/issues/new).

Los issues con el label `datos` son correcciones de contenido. Los que no tienen label son sugerencias o errores técnicos.

---

## Licencia

Los datos son de fuentes públicas. El código es MIT.
