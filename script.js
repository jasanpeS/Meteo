// script.js

const btnFetch = document.getElementById('btnFetch');
const btnGeo = document.getElementById('btnGeo');
const latInput = document.getElementById('lat');
const lonInput = document.getElementById('lon');
const weatherTable = document.getElementById('weather-table');
const airInfo = document.getElementById('air-info');

// Función para obtener geolocalización
btnGeo.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latInput.value = pos.coords.latitude.toFixed(4);
        lonInput.value = pos.coords.longitude.toFixed(4);
      },
      (err) => alert('Error al obtener geolocalización: ' + err.message)
    );
  } else {
    alert('Geolocalización no soportada');
  }
});

// Función principal para consumir ambas APIs
btnFetch.addEventListener('click', async () => {
  const lat = parseFloat(latInput.value);
  const lon = parseFloat(lonInput.value);
  if (isNaN(lat) || isNaN(lon)) {
    alert('Introduce coordenadas válidas');
    return;
  }
  // Clear previous results while new data is fetching
  weatherTable.innerHTML = '<tr><td colspan="4">Cargando datos meteorológicos...</td></tr>';
  airInfo.innerHTML = '<p>Cargando datos de calidad del aire...</p>';
  
  await Promise.all([fetchWeather(lat, lon), fetchAirQuality(lat, lon)]);
});

// Obtener datos meteorológicos
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation_probability&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    renderWeatherTable(data.hourly); // Call renderWeatherTable with the hourly data
  } catch (e) {
    console.error('Error fetchWeather:', e);
    // Optionally, display an error message to the user in the weatherTable or a general error area
    weatherTable.innerHTML = '<tr><td colspan="4">Error al cargar datos meteorológicos.</td></tr>';
  }
}

// Renderizar tabla de pronóstico
function renderWeatherTable(hourly) {
  if (!hourly || !hourly.time || hourly.time.length === 0) {
    weatherTable.innerHTML = '<tr><td colspan="4">No hay datos meteorológicos disponibles.</td></tr>';
    return;
  }
  // Encabezado
  let html = '<tr><th>Hora</th><th>Temp (°C)</th><th>Hum (%)</th><th>Prec (%)</th></tr>';
  // Tomar las primeras 24 horas (o menos si la API devuelve menos)
  const count = Math.min(24, hourly.time.length);
  for (let i = 0; i < count; i++) {
    html += `<tr>
      <td>${new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${hourly.temperature_2m[i].toFixed(1)}</td>
      <td>${hourly.relativehumidity_2m[i]}</td>
      <td>${hourly.precipitation_probability[i]}</td>
    </tr>`;
  }
  weatherTable.innerHTML = html;
}

// Obtener datos de calidad del aire
async function fetchAirQuality(lat, lon) {
  const url = `https://api.openaq.org/v2/latest?coordinates=${lat},${lon}&radius=10000&parameter=pm25,pm10`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    renderAirInfo(data.results); // Call renderAirInfo with the results data
  } catch (e) {
    console.error('Error fetchAirQuality:', e);
    // Optionally, display an error message to the user in airInfo or a general error area
    airInfo.innerHTML = '<p>Error al cargar datos de calidad del aire.</p>';
  }
}

// Renderizar sección de calidad del aire
function renderAirInfo(results) {
  if (!results || !results.length || !results[0].measurements || results[0].measurements.length === 0) {
    airInfo.innerHTML = '<p>No hay datos de calidad del aire cercanos disponibles.</p>';
    return;
  }
  // Tomar el primer lugar con datos
  const measurements = results[0].measurements;
  let html = '';
  measurements.forEach((m) => {
    // Ensure parameter and value are valid before processing
    if (m && m.parameter && typeof m.value !== 'undefined' && m.unit) {
      const nivel = categorizeAQI(m.parameter, m.value);
      html += `<p><strong>${m.parameter.toUpperCase()}:</strong> ${m.value.toFixed(2)} ${m.unit} (${nivel})</p>`;
    }
  });

  if (html === '') {
    airInfo.innerHTML = '<p>No se encontraron datos válidos de PM2.5 o PM10.</p>';
  } else {
    airInfo.innerHTML = html;
  }
}

// Función para categorizar nivel de contaminación
function categorizeAQI(param, value) {
  const paramLower = param.toLowerCase(); // Ensure case-insensitivity for parameter
  if (paramLower === 'pm25' || paramLower === 'pm2.5') { // Accept 'pm2.5' as well
    if (value < 12) return 'Bueno';
    if (value < 35.5) return 'Moderado'; // Adjusted upper limit for PM2.5 'Moderado'
    if (value < 55.5) return 'Dañino a la salud para grupos sensibles';
    if (value < 150.5) return 'Dañino a la salud';
    if (value < 250.5) return 'Muy dañino a la salud';
    return 'Peligroso'; // For values >= 250.5
  }
  if (paramLower === 'pm10') {
    if (value < 55) return 'Bueno'; // Adjusted limits for PM10 based on common AQI scales
    if (value < 155) return 'Moderado';
    if (value < 255) return 'Dañino a la salud para grupos sensibles';
    if (value < 355) return 'Dañino a la salud';
    if (value < 425) return 'Muy dañino a la salud';
    return 'Peligroso'; // For values >= 425
  }
  return 'No clasificado'; // Return if parameter is not pm25 or pm10
}
