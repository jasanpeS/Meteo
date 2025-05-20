// script.js

// API Configuration Constants
const OPEN_METEO_API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_HOURLY_PARAMS = 'temperature_2m,relativehumidity_2m,precipitation_probability';

const OPEN_AQ_API_BASE_URL = 'https://api.openaq.org/v2/latest';
const OPEN_AQ_RADIUS = '10000'; // In meters
const OPEN_AQ_PARAMETERS = 'pm25,pm10';

const btnFetch = document.getElementById('btnFetch');
const btnGeo = document.getElementById('btnGeo');
const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const weatherTable = document.getElementById('weather-table');
const airInfo = document.getElementById('air-info');
const errorMessageContainer = document.getElementById('error-message-container');

// Helper function to display errors
function displayError(message) {
  errorMessageContainer.innerHTML = `<p>${message}</p>`; // Wrap message in a paragraph
  errorMessageContainer.style.display = 'block';
}

// Helper function to clear errors
function clearError() {
  errorMessageContainer.innerHTML = '';
  errorMessageContainer.style.display = 'none';
}

// Helper function to escape HTML characters
function escapeHTML(str) {
  if (str === null || typeof str === 'undefined') {
    return '';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Función para obtener geolocalización
btnGeo.addEventListener('click', () => {
  clearError(); // Clear previous errors
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latInput.value = pos.coords.latitude.toFixed(4);
        lonInput.value = pos.coords.longitude.toFixed(4);
      },
      (err) => displayError('Error al obtener geolocalización: ' + err.message) // Use displayError
    );
  } else {
    displayError('Geolocalización no soportada por este navegador.'); // Use displayError
  }
});

// Función principal para consumir ambas APIs
btnFetch.addEventListener('click', async () => {
  clearError(); // Clear previous errors at the start

  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);

  if (isNaN(lat) || isNaN(lon)) {
    displayError('Introduce coordenadas válidas (valores numéricos para latitud y longitud).');
    return;
  }

  // Robust validation for latitude and longitude ranges
  if (lat < -90 || lat > 90) {
    displayError('Latitud inválida. Debe estar entre -90 y 90.');
    return;
  }

  if (lon < -180 || lon > 180) {
    displayError('Longitud inválida. Debe estar entre -180 y 180.');
    return;
  }
  
  const originalButtonText = btnFetch.textContent;
  btnFetch.disabled = true;
  btnFetch.textContent = 'Cargando...';

  weatherTable.innerHTML = '<tr><td colspan="4">Cargando datos meteorológicos...</td></tr>';
  airInfo.innerHTML = '<p>Cargando datos de calidad del aire...</p>';
  
  try {
    await Promise.all([fetchWeather(lat, lon), fetchAirQuality(lat, lon)]);
  } catch (error) {
    console.error("Error in Promise.all:", error);
    // This catch block might not be strictly necessary if individual fetches handle their UI updates,
    // but it's good for unexpected errors from Promise.all itself.
    // displayError('Ocurrió un error general al obtener los datos. Inténtalo de nuevo.'); 
    // The individual error messages from fetchWeather/fetchAirQuality are usually more specific.
    // If both fail, the last one to call displayError will be shown, or a general one if preferred.
  } finally {
    btnFetch.disabled = false;
    btnFetch.textContent = originalButtonText;
  }
});

// Obtener datos meteorológicos
async function fetchWeather(lat, lon) {
  // clearError(); // Errors are cleared by btnFetch or btnGeo
  const url = `${OPEN_METEO_API_BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=${OPEN_METEO_HOURLY_PARAMS}&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Try to get error message from API if available
      let apiErrorMsg = `Error HTTP ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.reason) {
          apiErrorMsg += `: ${errorData.reason}`;
        }
      } catch (e) { /* ignore if error response is not json */ }
      throw new Error(apiErrorMsg);
    }
    const data = await res.json();
    renderWeatherTable(data.hourly);
  } catch (e) {
    console.error('Error fetchWeather:', e);
    displayError(`Error al cargar datos meteorológicos: ${e.message}`);
    weatherTable.innerHTML = '<tr><td colspan="4">No se pudieron cargar los datos meteorológicos.</td></tr>'; // Update table
  }
}

// Renderizar tabla de pronóstico
function renderWeatherTable(hourly) {
  if (!hourly || !hourly.time || hourly.time.length === 0) {
    weatherTable.innerHTML = '<tr><td colspan="4">No hay datos meteorológicos disponibles.</td></tr>';
    // displayError('No se encontraron datos meteorológicos para la ubicación seleccionada.'); // Optional: can be too noisy
    return;
  }
  // Encabezado
  let html = '<tr><th>Hora</th><th>Temp (°C)</th><th>Hum (%)</th><th>Prec (%)</th></tr>';
  // Tomar las primeras 24 horas (o menos si la API devuelve menos)
  const count = Math.min(24, hourly.time.length);
  for (let i = 0; i < count; i++) {
    html += `<tr>
      <td>${escapeHTML(new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</td>
      <td>${escapeHTML(hourly.temperature_2m[i].toFixed(1))}</td>
      <td>${escapeHTML(hourly.relativehumidity_2m[i])}</td>
      <td>${escapeHTML(hourly.precipitation_probability[i])}</td>
    </tr>`;
  }
  weatherTable.innerHTML = html;
}

// Obtener datos de calidad del aire
async function fetchAirQuality(lat, lon) {
  // clearError(); // Errors are cleared by btnFetch or btnGeo
  const url = `${OPEN_AQ_API_BASE_URL}?coordinates=${lat},${lon}&radius=${OPEN_AQ_RADIUS}&parameter=${OPEN_AQ_PARAMETERS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      let apiErrorMsg = `Error HTTP ${res.status}`;
       try {
        const errorData = await res.json();
        // OpenAQ error structure can vary, try to find a meaningful message
        if (errorData && errorData.detail && typeof errorData.detail === 'string') {
          apiErrorMsg += `: ${errorData.detail}`;
        } else if (errorData && Array.isArray(errorData.detail) && errorData.detail[0] && errorData.detail[0].msg) {
            apiErrorMsg += `: ${errorData.detail[0].msg}`;
        } else if (errorData && errorData.message) { // General message field
           apiErrorMsg += `: ${errorData.message}`;
        } else if (res.statusText) {
            apiErrorMsg += `: ${res.statusText}`; // Fallback to status text
        }
      } catch (e) { /* ignore if error response is not json */ }
      throw new Error(apiErrorMsg);
    }
    const data = await res.json();
    renderAirInfo(data.results);
  } catch (e) {
    console.error('Error fetchAirQuality:', e);
    displayError(`Error al cargar datos de calidad del aire: ${e.message}`);
    airInfo.innerHTML = '<p>No se pudieron cargar los datos de calidad del aire.</p>'; // Update airInfo div
  }
}

// Renderizar sección de calidad del aire
function renderAirInfo(results) {
  if (!results || !results.length || !results[0].measurements || results[0].measurements.length === 0) {
    airInfo.innerHTML = '<p>No hay datos de calidad del aire cercanos disponibles para esta ubicación.</p>';
    // displayError('No se encontraron datos de calidad del aire para la ubicación seleccionada.'); // Optional
    return;
  }
  // Tomar el primer lugar con datos
  const measurements = results[0].measurements;
  let html = '';
  measurements.forEach((m) => {
    // Ensure parameter and value are valid before processing
    if (m && m.parameter && typeof m.value !== 'undefined' && m.unit) {
      const nivel = categorizeAQI(m.parameter, m.value);
      html += `<p><strong>${escapeHTML(m.parameter.toUpperCase())}:</strong> ${escapeHTML(m.value.toFixed(2))} ${escapeHTML(m.unit)} (${escapeHTML(nivel)})</p>`;
    }
  });

  if (html === '') {
    airInfo.innerHTML = '<p>No se encontraron datos válidos de PM2.5 o PM10 en la respuesta.</p>';
  } else {
    airInfo.innerHTML = html;
  }
}

// Función para categorizar nivel de contaminación
function categorizeAQI(param, value) {
  const paramLower = param.toLowerCase(); // Ensure case-insensitivity for parameter
  if (paramLower === 'pm25' || paramLower === 'pm2.5') { // Accept 'pm2.5' as well
    if (value < 12) return 'Bueno';
    if (value < 35.5) return 'Moderado'; 
    if (value < 55.5) return 'Dañino a la salud para grupos sensibles';
    if (value < 150.5) return 'Dañino a la salud';
    if (value < 250.5) return 'Muy dañino a la salud';
    return 'Peligroso'; 
  }
  if (paramLower === 'pm10') {
    if (value < 55) return 'Bueno'; 
    if (value < 155) return 'Moderado';
    if (value < 255) return 'Dañino a la salud para grupos sensibles';
    if (value < 355) return 'Dañino a la salud';
    if (value < 425) return 'Muy dañino a la salud';
    return 'Peligroso';
  }
  return 'No clasificado'; 
}
