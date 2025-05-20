# Dashboard de Clima y Calidad del Aire Local

Este proyecto muestra un dashboard sencillo que integra datos de pronóstico meteorológico y calidad del aire en tiempo real para una ubicación específica, utilizando las APIs gratuitas de Open-Meteo y OpenAQ.

## Estructura del Proyecto

El proyecto consta de tres archivos principales:
-   `index.html`: La estructura de la página web.
-   `styles.css`: Los estilos para la presentación visual.
-   `script.js`: La lógica para obtener datos de las APIs y actualizar la página.

## Características

-   Entrada de ubicación por coordenadas manuales (latitud y longitud).
-   Opción para usar la geolocalización del navegador.
-   Pronóstico meteorológico para las próximas 24 horas (temperatura, humedad, probabilidad de precipitación) de Open-Meteo.
-   Mediciones de calidad del aire en tiempo real (PM2.5, PM10) de OpenAQ, con indicación de nivel de contaminación.

## Desarrollo Local y Problema de CORS

**Importante:** La API de OpenAQ (calidad del aire) tiene una política de CORS (Cross-Origin Resource Sharing) que bloquea las solicitudes si abres el archivo `index.html` directamente en tu navegador desde el sistema de archivos (ej. `file:///ruta/a/index.html`). Esto resultará en un error al intentar cargar los datos de calidad del aire.

Para desarrollar y probar la aplicación localmente de forma correcta, necesitas servir los archivos a través de un servidor HTTP local. Aquí tienes algunas maneras sencillas de hacerlo:

1.  **Usando Python:**
    Si tienes Python instalado, abre una terminal en la carpeta raíz del proyecto y ejecuta:
    ```bash
    python -m http.server
    ```
    Luego, abre tu navegador y ve a `http://localhost:8000`. (El puerto puede variar si el 8000 está ocupado).

2.  **Usando Node.js (con `serve`):**
    Si tienes Node.js y npm instalados, puedes instalar `serve` globalmente y luego usarlo:
    ```bash
    npm install -g serve
    serve .
    ```
    Luego, abre tu navegador y ve a la dirección que te indique (usualmente `http://localhost:3000`).

3.  **Usando la extensión Live Server en VS Code:**
    Si usas VS Code, la extensión "Live Server" es una excelente opción para servir archivos locales con un solo clic.

**Alternativa (Solo para Desarrollo): Extensiones de Navegador para CORS**
Existen extensiones de navegador que pueden desactivar las restricciones de CORS para el desarrollo local (por ejemplo, "Allow CORS: Access-Control-Allow-Origin" para Chrome). Sin embargo, estas solo deben usarse para desarrollo y no son una solución para producción.

Al usar un servidor local, las peticiones a la API de OpenAQ deberían funcionar correctamente.

## APIs Utilizadas

-   **Open-Meteo:** Para datos meteorológicos. (https://open-meteo.com/)
-   **OpenAQ:** Para datos de calidad del aire. (https://openaq.org/)

Ambas APIs son gratuitas y no requieren clave (API key) para uso no comercial.
