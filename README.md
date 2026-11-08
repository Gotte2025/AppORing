# Medidor de O-rings

App web (PWA) para medir O-rings con la cámara del celular y armar una lista de compra con cantidades.
Todo se guarda en el propio teléfono y **funciona sin conexión** una vez instalada.

## Cómo se usa

1. **Foto:** poné el O-ring (sin estirar) sobre una superficie plana, al lado de una tarjeta de débito/crédito (85,6 × 54 mm). Sacá la foto desde arriba, bien paralela a la mesa, con buena luz y lo más cerca posible.
2. **Referencia:** tocá los dos extremos de la tarjeta (lado largo).
3. **Interior:** tocá dos puntos opuestos del borde interior. El círculo verde tiene que calzar con el hueco.
4. **Exterior:** tocá dos puntos opuestos del borde exterior. El círculo celeste tiene que calzar.
5. La app calcula diámetro interior, exterior y grosor (sección) = (exterior − interior) / 2, y te sugiere grosores estándar cercanos.
6. Elegí material, cantidad y **Agregar a la lista**. Si repetís la misma medida, suma la cantidad.
7. En la pestaña **Lista** podés ajustar cantidades, editar, copiar el texto, compartirlo (WhatsApp, etc.) o bajar un CSV.

Podés arrastrar cada punto para ajustarlo: mientras lo movés aparece una lupa.
También podés escribir la medida a mano si ya la tomaste con calibre.

**Precisión:** con una foto bien tomada se llega a unos ±0,2–0,5 mm. Para piezas críticas, confirmá con calibre.

## Subirla a GitHub y usarla en el celular

1. Creá un repositorio nuevo en GitHub (por ejemplo `medidor-orings`) y subí **todos** los archivos de esta carpeta a la raíz del repositorio.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
3. Esperá un minuto. GitHub te da una dirección tipo `https://TU-USUARIO.github.io/medidor-orings/`.
4. Abrí esa dirección **en el celular, con internet**, una vez.
   - **Android (Chrome):** menú ⋮ → **Instalar app** (o **Agregar a la pantalla principal**), o el botón “Instalar” de la app.
   - **iPhone (Safari):** botón Compartir → **Agregar a pantalla de inicio**.
5. Listo: desde el ícono la app abre y funciona sin conexión.

Los datos de la lista quedan guardados en ese celular (no se sincronizan con otros dispositivos).
Si borrás los datos del navegador/app, se pierde la lista: usá “Copiar” o “CSV” para respaldarla.

## Actualizar la app

Si modificás algún archivo, cambiá `const CACHE = 'oring-v1'` en `sw.js` (por ejemplo a `oring-v2`) para que los celulares descarguen la versión nueva.

## Archivos

- `index.html`, `style.css`, `app.js`: la app
- `sw.js`: permite el uso sin conexión
- `manifest.json`, `icon-192.png`, `icon-512.png`: instalación como app
- `logo.jpg`: logo de VSM Hidráulica e Ingeniería (se muestra en el encabezado y en el ícono). Para cambiarlo, reemplazá ese archivo por otro con el mismo nombre y subí la versión de caché en `sw.js`.
