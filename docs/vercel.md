# Despliegue en Vercel

## Estructura

- `frontend/`: HTML, CSS, JavaScript y recursos públicos.
- `backend/greedy.py`: algoritmo Greedy String Tiling, sin dependencias externas.
- `api/greedy.py`: entrada HTTP para Vercel; importa el algoritmo del backend.
- `tests/`: pruebas del algoritmo y de la API.
- `vercel.json`: publica solo `frontend/` como archivos estáticos e incluye el backend en la función Python.

Los nuevos algoritmos van en `backend/`, sus entradas HTTP en `api/`, los programas de muestra en `ejemplos/` y la documentación en `docs/`.

## Configuración del proyecto existente

1. En Vercel, abre el proyecto y Settings → Build and Deployment.
2. Usa la raíz del repositorio como Root Directory (vacío o `.`), no `frontend`.
3. Selecciona Framework Preset: Other. Desactiva overrides de Build Command y Output Directory que contradigan `vercel.json`: no hay compilación y la salida es `frontend`.
4. Revisa localmente los cambios, crea tu commit y haz push a la rama conectada. Esto puede activar el despliegue automático.
5. Comprueba que la web carga y compara dos archivos de `ejemplos/`. En «Ver fragmentos» debe aparecer «Cobertura Greedy».
6. Si falla, revisa los logs de `/api/greedy` en Vercel. Un GET a esa ruta devuelve 405 por diseño: la API requiere POST.

No se necesita Render, base de datos, claves ni paquetes Python externos. Hobby tiene cuotas y está destinado a uso personal no comercial.

## Pruebas locales

Desde la raíz:

```bash
python3 -m unittest discover -s tests -v
node --check frontend/app.js
```

Para probar web y función juntas, con Node.js y Python instalados:

```bash
npx vercel dev
```

La primera ejecución puede solicitar instalar la CLI, iniciar sesión y vincular el proyecto existente. Abrir el HTML directamente o usar un servidor estático permite usar el análisis original, pero no ejecuta la API Python.

## Contrato de la API

`POST /api/greedy`, con `Content-Type: application/json`:

```json
{"tokens_a":["ID","=","NUM"],"tokens_b":["ID","=","NUM"],"min_length":3}
```

Devuelve `blocks` con `a_start`, `b_start` (índices desde cero) y `length`, además de `matched_tokens`, `coverage` y `min_length`. Los bloques no reutilizan posiciones. Los empates se resuelven por orden de aparición en A y luego en B. Se prioriza la longitud, sin garantizar cobertura óptima.

La cobertura es `200 × tokens emparejados / (tokens de A + tokens de B)`; no sustituye el porcentaje original de similitud. Si un programa tiene menos tokens que el mínimo, no hay bloques.

Límites: 2,000 tokens por programa, 128 caracteres por token, 600,000 bytes por petición, 4 millones de celdas evaluadas y aproximadamente 4 segundos de cálculo. Si se supera el presupuesto, devuelve 422 sin resultados parciales. La interfaz conserva el resaltado original cuando Greedy no está disponible y reutiliza resultados durante la sesión.

Los tokens se procesan en Vercel. La API no los persiste ni ejecuta código. Los textos de cadenas y nombres se normalizan en el navegador antes del envío.

Referencias: https://vercel.com/docs/functions/runtimes/python y https://vercel.com/docs/project-configuration/vercel-json
