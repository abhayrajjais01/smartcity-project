// Smart City Dashboard - Enhanced with Live AQI APIs for Multiple Cities and States
// Air Quality: API Ninjas (city-based) -> AQICN (city/coordinates) -> Open-Meteo (coordinates) -> OpenAQ (final fallback)
// Weather API Key (OpenWeatherMap): 3c8ffd7f7339a065c6ce070bc0601a93

// Note: API Ninjas and AQICN support city names directly for live AQI data across different cities and states
const WEATHER_API_KEY = '3c8ffd7f7339a065c6ce070bc0601a93';

// Chart contexts
const aqCtx = document.getElementById('aqChart').getContext('2d');
const weatherCtx = document.getElementById('weatherChart').getContext('2d');
const trafficCtx = document.getElementById('trafficChart').getContext('2d');
const energyCtx = document.getElementById('energyChart').getContext('2d');

// DOM elements
const cityInput = document.getElementById('cityInput');
const loadBtn = document.getElementById('loadBtn');
const loader = document.getElementById('loader');
const lastUpdate = document.getElementById('lastUpdate');
const autoRefreshToggle = document.getElementById('autoRefresh');
const insightsGrid = document.getElementById('insightsGrid');

// Metric value elements
const aqiValue = document.getElementById('aqiValue');
const aqiLabel = document.getElementById('aqiLabel');
const tempValue = document.getElementById('tempValue');
const tempLabel = document.getElementById('tempLabel');
const trafficValue = document.getElementById('trafficValue');
const trafficLabel = document.getElementById('trafficLabel');
const energyValue = document.getElementById('energyValue');
const energyLabel = document.getElementById('energyLabel');

// Chart instances
let aqChart = null;
let weatherChart = null;
let trafficChart = null;
let energyChart = null;

let currentCoords = { lat: 28.6139, lon: 77.209 }; // default: Delhi
let currentCity = 'Delhi';
let refreshInterval = null;

// Helper: Geocode city name to coordinates
async function geocodeCity(city) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'SmartCityDashboard/1.0' }
    });
    if (res.data && res.data[0]) {
      return { 
        lat: parseFloat(res.data[0].lat), 
        lon: parseFloat(res.data[0].lon),
        name: res.data[0].display_name.split(',')[0]
      };
    }
  } catch (err) {
    console.warn('Geocode failed', err);
  }
  return null;
}

// Fetch live AQI data for different cities and states
// Uses multiple APIs to get real-time air quality data
async function fetchAirPollution(lat, lon, cityName = null) {
  // Try API Ninjas Air Quality API first (supports city names)
  if (cityName) {
    try {
      const url = `https://api.api-ninjas.com/v1/airquality?city=${encodeURIComponent(cityName)}`;
      const res = await axios.get(url, {
        headers: {
          'X-Api-Key': '' // API Ninjas allows some free requests without key, or add your key
        }
      });
      console.log('API Ninjas Air Quality API response:', res.data);
      if (res.data && (res.data.overall_aqi !== undefined || res.data.CO || res.data.PM2_5 || res.data.PM10)) {
        return { 
          data: res.data, 
          source: 'api-ninjas',
          city: cityName 
        };
      }
    } catch (err) {
      console.warn('API Ninjas failed, trying AQICN:', err.message);
      // Try AQICN API (World Air Quality Index)
      try {
        const aqicnUrl = `https://api.waqi.info/feed/${encodeURIComponent(cityName)}/?token=demo`; // Use demo token or get your own
        const aqicnRes = await axios.get(aqicnUrl);
        console.log('AQICN API response:', aqicnRes.data);
        if (aqicnRes.data && aqicnRes.data.status === 'ok' && aqicnRes.data.data) {
          return {
            data: aqicnRes.data.data,
            source: 'aqicn',
            city: cityName
          };
        }
      } catch (aqicnErr) {
        console.warn('AQICN city search failed, trying coordinates:', aqicnErr.message);
        // Try AQICN with coordinates
        try {
          const aqicnCoordUrl = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=demo`;
          const aqicnCoordRes = await axios.get(aqicnCoordUrl);
          if (aqicnCoordRes.data && aqicnCoordRes.data.status === 'ok' && aqicnCoordRes.data.data) {
            return {
              data: aqicnCoordRes.data.data,
              source: 'aqicn',
              city: cityName
            };
          }
        } catch (coordErr) {
          console.warn('AQICN coordinate search also failed:', coordErr.message);
        }
      }
    }
  }
  
  // Fallback to coordinate-based APIs
  try {
    // Try Open-Meteo Air Quality API (works globally with coordinates)
    const url = 'https://air-quality-api.open-meteo.com/v1/air-quality';
    const params = {
      latitude: lat,
      longitude: lon,
      hourly: 'pm10,pm2_5,european_aqi,us_aqi',
      current: 'european_aqi,us_aqi,pm10,pm2_5',
      timezone: 'auto'
    };
    const res = await axios.get(url, { params });
    console.log('Open-Meteo Air Quality API response:', res.data);
    if (res.data && (res.data.current || res.data.hourly)) {
      return res.data;
    }
    throw new Error('Invalid response format from Open-Meteo');
  } catch (err) {
    console.warn('Open-Meteo Air Quality API failed, falling back to OpenAQ:', err.message);
    // Final fallback to OpenAQ
    const openAQData = await fetchOpenAQ(lat, lon);
    console.log('OpenAQ fallback response:', openAQData);
    return openAQData;
  }
}

// Fetch air pollution forecast from Open-Meteo Air Quality API
async function fetchAirPollutionForecast(lat, lon) {
  try {
    const url = 'https://air-quality-api.open-meteo.com/v1/air-quality';
    const params = {
      latitude: lat,
      longitude: lon,
      hourly: 'pm10,pm2_5,european_aqi,us_aqi',
      forecast_days: 5,
      timezone: 'auto'
    };
    const res = await axios.get(url, { params });
    console.log('Open-Meteo Air Quality Forecast response:', res.data);
    return res.data;
  } catch (err) {
    console.warn('Open-Meteo Air Quality Forecast failed:', err.message);
    return null;
  }
}

// Fallback: Fetch air quality data from OpenAQ (if OpenWeatherMap fails)
async function fetchOpenAQ(lat, lon, limit = 50) {
  try {
  const url = 'https://api.openaq.org/v2/measurements';
    const params = { 
      coordinates: `${lat},${lon}`, 
      limit, 
      sort: 'desc',
      radius: 10000
    };
    const res = await axios.get(url, { params });
    return res.data;
  } catch (err) {
    console.error('OpenAQ fetch failed:', err);
    return { results: [] };
  }
}

// Fetch weather data from OpenWeatherMap
async function fetchOpenWeatherMap(lat, lon) {
  try {
    const url = 'https://api.openweathermap.org/data/2.5/forecast';
    const params = {
      lat: lat,
      lon: lon,
      appid: WEATHER_API_KEY,
      units: 'metric',
      cnt: 24
    };
  const res = await axios.get(url, { params });
  return res.data;
  } catch (err) {
    console.error('OpenWeatherMap fetch failed:', err);
    // Fallback to Open-Meteo if OpenWeatherMap fails
    return await fetchOpenMeteo(lat, lon);
  }
}

// Fallback: Fetch weather from Open-Meteo (no API key)
async function fetchOpenMeteo(lat, lon) {
  try {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const params = {
    latitude: lat,
    longitude: lon,
      hourly: 'temperature_2m,relativehumidity_2m',
    current_weather: true,
    timezone: 'auto'
  };
  const res = await axios.get(url, { params });
  return res.data;
  } catch (err) {
    console.error('Open-Meteo fetch failed:', err);
    return null;
  }
}

// Simulate traffic density based on time and weather
function generateTrafficData(weatherData, hours = 24) {
  const traffic = [];
  const baseTraffic = 60; // Base traffic percentage
  
  for (let i = 0; i < hours; i++) {
    const hour = new Date().getHours() + i;
    // Rush hours: 7-9 AM and 5-7 PM have higher traffic
    let trafficLevel = baseTraffic;
    if ((hour % 24 >= 7 && hour % 24 <= 9) || (hour % 24 >= 17 && hour % 24 <= 19)) {
      trafficLevel = 85 + Math.random() * 10;
    } else if (hour % 24 >= 22 || hour % 24 <= 5) {
      trafficLevel = 20 + Math.random() * 15;
    } else {
      trafficLevel = 50 + Math.random() * 20;
    }
    traffic.push(Math.round(trafficLevel));
  }
  return traffic;
}

// Simulate energy consumption based on temperature and time
function generateEnergyData(weatherData, hours = 24) {
  const energy = [];
  let isOpenWeather = weatherData && weatherData.list;
  
  for (let i = 0; i < hours; i++) {
    let temp = 20;
    if (isOpenWeather && weatherData.list[i]) {
      temp = weatherData.list[i].main.temp;
    } else if (weatherData && weatherData.hourly && weatherData.hourly.temperature_2m) {
      temp = weatherData.hourly.temperature_2m[i] || 20;
    }
    
    const hour = new Date().getHours() + i;
    let energyLevel = 50;
    
    // Higher energy during peak hours (6-10 AM, 6-10 PM)
    if ((hour % 24 >= 6 && hour % 24 <= 10) || (hour % 24 >= 18 && hour % 24 <= 22)) {
      energyLevel = 70 + Math.random() * 15;
    } else if (hour % 24 >= 22 || hour % 24 <= 6) {
      energyLevel = 30 + Math.random() * 15;
    } else {
      energyLevel = 50 + Math.random() * 15;
    }
    
    // Adjust based on temperature (extreme temps need more heating/cooling)
    if (temp < 10 || temp > 30) {
      energyLevel += 15;
    }
    
    energy.push(Math.round(Math.min(100, Math.max(0, energyLevel))));
  }
  return energy;
}

// Calculate US AQI from PM2.5 or PM10 using EPA formula
function calculateUSAQI(pm, type) {
  // PM2.5 breakpoints (µg/m³)
  const pm25Breakpoints = [
    { low: 0, high: 12.0, aqiLow: 0, aqiHigh: 50 },
    { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
    { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
    { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
    { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
    { low: 250.5, high: 500.4, aqiLow: 301, aqiHigh: 500 }
  ];
  
  // PM10 breakpoints (µg/m³)
  const pm10Breakpoints = [
    { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
    { low: 55, high: 154, aqiLow: 51, aqiHigh: 100 },
    { low: 155, high: 254, aqiLow: 101, aqiHigh: 150 },
    { low: 255, high: 354, aqiLow: 151, aqiHigh: 200 },
    { low: 355, high: 424, aqiLow: 201, aqiHigh: 300 },
    { low: 425, high: 604, aqiLow: 301, aqiHigh: 500 }
  ];
  
  const breakpoints = type === 'pm25' ? pm25Breakpoints : pm10Breakpoints;
  
  // Find the appropriate breakpoint
  for (const bp of breakpoints) {
    if (pm >= bp.low && pm <= bp.high) {
      // Calculate AQI using linear interpolation formula
      const aqi = Math.round(((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (pm - bp.low) + bp.aqiLow);
      return aqi;
    }
  }
  
  // If value exceeds highest breakpoint, return 500
  return 500;
}

// Calculate AQI from OpenWeatherMap AQI (1-5) or PM2.5/PM10 values
function calculateAQI(aqiValue, pm25, pm10) {
  // If a US AQI value (0-500) is provided directly, use it
  if (aqiValue !== null && aqiValue !== undefined && aqiValue >= 0 && aqiValue <= 500 && aqiValue > 5) {
    let label, color;
    if (aqiValue <= 50) { label = 'Good'; color = '#10b981'; }
    else if (aqiValue <= 100) { label = 'Moderate'; color = '#84cc16'; }
    else if (aqiValue <= 150) { label = 'Unhealthy for Sensitive'; color = '#f59e0b'; }
    else if (aqiValue <= 200) { label = 'Unhealthy'; color = '#f97316'; }
    else if (aqiValue <= 300) { label = 'Very Unhealthy'; color = '#ef4444'; }
    else { label = 'Hazardous'; color = '#991b1b'; }
    return { value: Math.round(aqiValue), label, color, rawAqi: aqiValue };
  }
  
  // If OpenWeatherMap AQI is provided (1-5 scale), convert to US AQI
  if (aqiValue && aqiValue >= 1 && aqiValue <= 5) {
    const aqiLabels = {
      1: { label: 'Good', color: '#10b981', usaqi: 50 },
      2: { label: 'Fair', color: '#84cc16', usaqi: 100 },
      3: { label: 'Moderate', color: '#f59e0b', usaqi: 150 },
      4: { label: 'Poor', color: '#f97316', usaqi: 200 },
      5: { label: 'Very Poor', color: '#ef4444', usaqi: 300 }
    };
    const aqi = aqiLabels[aqiValue];
    return { value: aqi.usaqi, label: aqi.label, color: aqi.color, rawAqi: aqiValue };
  }
  
  // Calculate from PM2.5/PM10 values using proper EPA formula
  if (!pm25 && !pm10) return { value: 0, label: 'No Data', color: '#94a3b8' };
  
  // Calculate AQI from PM2.5 (preferred) or PM10
  let usaqi;
  if (pm25 && pm25 > 0) {
    usaqi = calculateUSAQI(pm25, 'pm25');
  } else if (pm10 && pm10 > 0) {
    usaqi = calculateUSAQI(pm10, 'pm10');
  } else {
    return { value: 0, label: 'No Data', color: '#94a3b8' };
  }
  
  // Determine label and color based on US AQI
  let label, color;
  if (usaqi <= 50) { label = 'Good'; color = '#10b981'; }
  else if (usaqi <= 100) { label = 'Moderate'; color = '#84cc16'; }
  else if (usaqi <= 150) { label = 'Unhealthy for Sensitive'; color = '#f59e0b'; }
  else if (usaqi <= 200) { label = 'Unhealthy'; color = '#f97316'; }
  else if (usaqi <= 300) { label = 'Very Unhealthy'; color = '#ef4444'; }
  else { label = 'Hazardous'; color = '#991b1b'; }
  
  return { value: usaqi, label, color, rawAqi: null };
}

// Format time labels
function formatTimeLabels(arr) {
  return arr.map(t => {
    const d = new Date(t);
    const hh = d.getHours().toString().padStart(2, '0');
    return `${hh}:00`;
  });
}

// Render Air Quality Chart
function renderAQChart(labels, pm25, pm10) {
  if (aqChart) aqChart.destroy();
  aqChart = new Chart(aqCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { 
          label: 'PM2.5 (µg/m³)', 
          data: pm25, 
          tension: 0.4, 
          borderColor: '#ef4444', 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        },
        { 
          label: 'PM10 (µg/m³)', 
          data: pm10, 
          tension: 0.4, 
          borderColor: '#f59e0b', 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Concentration (µg/m³)' } }
      }
    }
  });
}

// Render Weather Chart
function renderWeatherChart(labels, temps) {
  if (weatherChart) weatherChart.destroy();
  weatherChart = new Chart(weatherCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { 
          label: 'Temperature (°C)', 
          data: temps, 
          tension: 0.4, 
          borderColor: '#2563eb', 
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true, 
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { title: { display: true, text: 'Temperature (°C)' } }
      }
    }
  });
}

// Render Traffic Chart
function renderTrafficChart(labels, trafficData) {
  if (trafficChart) trafficChart.destroy();
  trafficChart = new Chart(trafficCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { 
          label: 'Traffic Density (%)', 
          data: trafficData, 
          backgroundColor: trafficData.map(v => {
            if (v >= 80) return 'rgba(239, 68, 68, 0.7)';
            if (v >= 60) return 'rgba(245, 158, 11, 0.7)';
            return 'rgba(16, 185, 129, 0.7)';
          }),
          borderColor: trafficData.map(v => {
            if (v >= 80) return '#ef4444';
            if (v >= 60) return '#f59e0b';
            return '#10b981';
          }),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Traffic Density (%)' } }
      }
    }
  });
}

// Render Energy Chart
function renderEnergyChart(labels, energyData) {
  if (energyChart) energyChart.destroy();
  energyChart = new Chart(energyCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { 
          label: 'Energy Index', 
          data: energyData, 
          tension: 0.4, 
          borderColor: '#f59e0b', 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Energy Index' } }
      }
    }
  });
}

// Update Insights Panel
function updateInsights(insights) {
  insightsGrid.innerHTML = '';
  insights.forEach(insight => {
    const div = document.createElement('div');
    div.className = 'insight-item';
    div.innerHTML = `<p>${insight}</p>`;
    insightsGrid.appendChild(div);
  });
}

// Update metric cards
function updateMetrics(aqiData, temp, traffic, energy) {
  // AQI - supports OpenWeatherMap AQI (1-5) or PM values
  const aqi = calculateAQI(aqiData.aqi, aqiData.pm25, aqiData.pm10);
  aqiValue.textContent = aqi.value || '—';
  aqiLabel.textContent = aqi.label;
  aqiValue.style.color = aqi.color;
  
  // Temperature
  tempValue.textContent = temp !== null ? `${Math.round(temp)}°C` : '—';
  tempLabel.textContent = temp !== null ? 'Current' : 'No Data';
  
  // Traffic
  const avgTraffic = traffic.reduce((a, b) => a + b, 0) / traffic.length;
  trafficValue.textContent = `${Math.round(avgTraffic)}%`;
  if (avgTraffic >= 80) trafficLabel.textContent = 'Heavy';
  else if (avgTraffic >= 60) trafficLabel.textContent = 'Moderate';
  else trafficLabel.textContent = 'Light';
  
  // Energy
  const avgEnergy = energy.reduce((a, b) => a + b, 0) / energy.length;
  energyValue.textContent = `${Math.round(avgEnergy)}`;
  if (avgEnergy >= 70) energyLabel.textContent = 'High';
  else if (avgEnergy >= 50) energyLabel.textContent = 'Normal';
  else energyLabel.textContent = 'Low';
}

// Main function to load all data for a city
async function loadAllForCity(cityName) {
  try {
    loader.style.display = 'inline-block';
    loadBtn.disabled = true;
    
    // Update insights with loading message
    updateInsights(['🔄 Fetching city coordinates and data...']);
    
    // Geocode city
    const location = await geocodeCity(cityName);
    if (!location) {
      throw new Error('City not found. Please try a different city name.');
    }
    
    currentCoords = { lat: location.lat, lon: location.lon };
    currentCity = location.name || cityName;
    
    // Fetch data in parallel - pass city name for better API support
    const [airPollutionResp, airPollutionForecastResp, weatherResp] = await Promise.all([
      fetchAirPollution(location.lat, location.lon, currentCity),
      fetchAirPollutionForecast(location.lat, location.lon),
      fetchOpenWeatherMap(location.lat, location.lon)
    ]);
    
    // Process Air Quality data from aqi.in or other sources
    let pm25Data = [];
    let pm10Data = [];
    let labels = [];
    let currentAQI = null;
    let currentPM25 = null;
    let currentPM10 = null;
    
    console.log('Processing air pollution response:', airPollutionResp);
    
    // Check if response is from API Ninjas
    if (airPollutionResp && airPollutionResp.source === 'api-ninjas' && airPollutionResp.data) {
      const data = airPollutionResp.data;
      // API Ninjas format: { overall_aqi, CO: { aqi, concentration }, PM2_5: { aqi, concentration }, PM10: { aqi, concentration }, etc. }
      currentAQI = data.overall_aqi || (data.PM2_5 && data.PM2_5.aqi) || (data.PM10 && data.PM10.aqi) || null;
      currentPM25 = (data.PM2_5 && data.PM2_5.concentration) || null;
      currentPM10 = (data.PM10 && data.PM10.concentration) || null;
      
      // Keep US AQI as-is (0-500), calculateAQI will handle it properly
      
      // Use current data point for chart
      if (currentPM25 !== null || currentPM10 !== null) {
        labels = [new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })];
        pm25Data = [currentPM25 || 0];
        pm10Data = [currentPM10 || 0];
      }
      
      console.log('Extracted from API Ninjas - PM2.5:', currentPM25, 'PM10:', currentPM10, 'AQI:', currentAQI);
    } 
    // Check if response is from AQICN
    else if (airPollutionResp && airPollutionResp.source === 'aqicn' && airPollutionResp.data) {
      const data = airPollutionResp.data;
      // AQICN format: { aqi, iaqi: { pm25: { v }, pm10: { v } }, time: { s }, city: { name } }
      currentAQI = data.aqi || null;
      currentPM25 = (data.iaqi && data.iaqi.pm25 && data.iaqi.pm25.v) || null;
      currentPM10 = (data.iaqi && data.iaqi.pm10 && data.iaqi.pm10.v) || null;
      
      // Keep US AQI as-is (0-500), calculateAQI will handle it properly
      
      // Use current data point for chart
      if (currentPM25 !== null || currentPM10 !== null) {
        labels = [new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })];
        pm25Data = [currentPM25 || 0];
        pm10Data = [currentPM10 || 0];
      }
      
      console.log('Extracted from AQICN - PM2.5:', currentPM25, 'PM10:', currentPM10, 'AQI:', currentAQI);
    }
    // Check if response is from NYC Open Data
    else if (airPollutionResp && airPollutionResp.source === 'nyc-open-data' && airPollutionResp.results) {
      // NYC Open Data format - array of records
      const records = airPollutionResp.results || [];
      console.log('NYC Open Data records:', records.length);
      
      // Process records - try to extract PM2.5, PM10, AQI from various possible field names
      const processedRecords = records.slice(0, 30).reverse();
      
      processedRecords.forEach((record, index) => {
        // Try different field name variations
        const pm25 = parseFloat(record.pm25 || record.pm2_5 || record.PM25 || record.PM2_5 || record['pm2.5'] || record['PM2.5'] || 0);
        const pm10 = parseFloat(record.pm10 || record.PM10 || 0);
        const aqi = parseFloat(record.aqi || record.AQI || record.air_quality_index || record.index || 0);
        
        // Extract timestamp
        const timestamp = record.date || record.timestamp || record.time || record.created_at || new Date().toISOString();
        const date = new Date(timestamp);
        
        labels.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        pm25Data.push(pm25);
        pm10Data.push(pm10);
        
        // Use latest record for current values
        if (index === processedRecords.length - 1) {
          currentPM25 = pm25 || null;
          currentPM10 = pm10 || null;
          currentAQI = aqi || null;
          
          // Keep US AQI as-is (0-500), calculateAQI will handle it properly
        }
      });
      
      console.log('Extracted from NYC Open Data - PM2.5:', currentPM25, 'PM10:', currentPM10, 'AQI:', currentAQI);
    } else if (airPollutionResp && (airPollutionResp.current || airPollutionResp.hourly)) {
      // Open-Meteo Air Quality API format
      const current = airPollutionResp.current || {};
      const hourly = airPollutionResp.hourly || {};
      
      // Extract current values
      currentPM25 = current.pm2_5 || null;
      currentPM10 = current.pm10 || null;
      currentAQI = current.us_aqi || current.european_aqi || null;
      
      // Keep US AQI as-is (0-500), calculateAQI will handle it properly
      // Note: European AQI uses different scale, but we'll treat it as US AQI for display
      
      // Use hourly data for chart if available
      if (hourly.time && hourly.pm2_5 && hourly.pm10) {
        const timeArray = hourly.time.slice(0, 24);
        const pm25Array = hourly.pm2_5.slice(0, 24);
        const pm10Array = hourly.pm10.slice(0, 24);
        
        labels = timeArray.map(time => {
          const date = new Date(time);
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });
        pm25Data = pm25Array;
        pm10Data = pm10Array;
      } else if (airPollutionForecastResp && airPollutionForecastResp.hourly) {
        // Use forecast hourly data
        const forecastHourly = airPollutionForecastResp.hourly;
        if (forecastHourly.time && forecastHourly.pm2_5 && forecastHourly.pm10) {
          const timeArray = forecastHourly.time.slice(0, 24);
          const pm25Array = forecastHourly.pm2_5.slice(0, 24);
          const pm10Array = forecastHourly.pm10.slice(0, 24);
          
          labels = timeArray.map(time => {
            const date = new Date(time);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          });
          pm25Data = pm25Array;
          pm10Data = pm10Array;
        }
      } else {
        // If no hourly data, use current data point
        if (currentPM25 !== null || currentPM10 !== null) {
          labels = [new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })];
          pm25Data = [currentPM25 || 0];
          pm10Data = [currentPM10 || 0];
        }
      }
    } else if (airPollutionResp && (airPollutionResp.aqi || airPollutionResp.data || airPollutionResp.current || airPollutionResp.status === 'ok')) {
      // Legacy format support (for other APIs)
      const data = airPollutionResp.data || airPollutionResp.current || airPollutionResp;
      
      // Extract AQI
      currentAQI = data.aqi || data.AQI || data.air_quality_index || data.index || null;
      
      // Extract PM2.5 and PM10 - try different field names
      currentPM25 = data.pm25 || data.pm2_5 || data.PM25 || data.PM2_5 || data.pm25_concentration || null;
      currentPM10 = data.pm10 || data.PM10 || data.pm10_concentration || null;
      
      // Keep US AQI as-is (0-500), calculateAQI will handle it properly
      
      // Use forecast data for chart if available
      if (airPollutionForecastResp && (airPollutionForecastResp.forecast || airPollutionForecastResp.data || airPollutionForecastResp.list)) {
        const forecast = airPollutionForecastResp.forecast || airPollutionForecastResp.data || airPollutionForecastResp.list || [];
        const forecastArray = Array.isArray(forecast) ? forecast : (forecast.hourly || forecast.daily || []);
        const forecastSlice = forecastArray.slice(0, 24);
        
        forecastSlice.forEach((item, index) => {
          const timestamp = item.dt ? item.dt * 1000 : (item.timestamp ? item.timestamp * 1000 : Date.now() + index * 3600000);
          labels.push(new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
          pm25Data.push(item.pm25 || item.pm2_5 || item.PM25 || item.PM2_5 || item.pm25_concentration || 0);
          pm10Data.push(item.pm10 || item.PM10 || item.pm10_concentration || 0);
        });
      } else {
        // If no forecast, use current data point
        if (currentPM25 !== null || currentPM10 !== null) {
          labels = [new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })];
          pm25Data = [currentPM25 || 0];
          pm10Data = [currentPM10 || 0];
        }
      }
    } else if (airPollutionResp && airPollutionResp.list) {
      // OpenWeatherMap Air Pollution API format (fallback)
      const current = airPollutionResp.list[0];
      if (current) {
        currentAQI = current.main?.aqi || null;
        currentPM25 = current.components?.pm2_5 || null;
        currentPM10 = current.components?.pm10 || null;
      }
      
      // Use forecast data for chart if available
      if (airPollutionForecastResp && airPollutionForecastResp.list) {
        const forecast = airPollutionForecastResp.list.slice(0, 24);
        labels = forecast.map(item => 
          new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        );
        pm25Data = forecast.map(item => item.components?.pm2_5 || 0);
        pm10Data = forecast.map(item => item.components?.pm10 || 0);
      } else {
        // If no forecast, use current data point
        if (currentPM25 !== null || currentPM10 !== null) {
          labels = [new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })];
          pm25Data = [currentPM25 || 0];
          pm10Data = [currentPM10 || 0];
        }
      }
    } else if (airPollutionResp && airPollutionResp.results) {
      // Fallback: OpenAQ format
      const results = airPollutionResp.results || [];
      console.log('OpenAQ results:', results.length);
      const pm25 = results.filter(r => r.parameter === 'pm25').slice(0, 30).reverse();
      const pm10 = results.filter(r => r.parameter === 'pm10').slice(0, 30).reverse();
      
      console.log('PM2.5 samples:', pm25.length, 'PM10 samples:', pm10.length);
      
      labels = (pm25.length ? pm25 : pm10.length ? pm10 : []).map(r => 
        new Date(r.date.utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
      pm25Data = pm25.map(r => r.value);
      pm10Data = pm10.map(r => r.value);
      currentPM25 = pm25Data.length ? pm25Data[pm25Data.length - 1] : null;
      currentPM10 = pm10Data.length ? pm10Data[pm10Data.length - 1] : null;
      
      console.log('Extracted PM2.5:', currentPM25, 'PM10:', currentPM10);
    } else {
      // If no data found, log for debugging
      console.warn('No air quality data found in response:', airPollutionResp);
      // Try to use OpenAQ as last resort
      const openAQData = await fetchOpenAQ(location.lat, location.lon);
      if (openAQData && openAQData.results) {
        const results = openAQData.results || [];
        const pm25 = results.filter(r => r.parameter === 'pm25').slice(0, 30).reverse();
        const pm10 = results.filter(r => r.parameter === 'pm10').slice(0, 30).reverse();
        
        labels = (pm25.length ? pm25 : pm10.length ? pm10 : []).map(r => 
          new Date(r.date.utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        );
        pm25Data = pm25.map(r => r.value);
        pm10Data = pm10.map(r => r.value);
        currentPM25 = pm25Data.length ? pm25Data[pm25Data.length - 1] : null;
        currentPM10 = pm10Data.length ? pm10Data[pm10Data.length - 1] : null;
      }
    }
    
    // Process Weather data
    let weatherLabels = [];
    let temps = [];
    let currentTemp = null;
    
    if (weatherResp && weatherResp.list) {
      // OpenWeatherMap format
      weatherLabels = weatherResp.list.map(item => 
        new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
      temps = weatherResp.list.map(item => item.main.temp);
      currentTemp = weatherResp.list[0]?.main.temp || null;
    } else if (weatherResp && weatherResp.hourly) {
      // Open-Meteo format
      const hours = weatherResp.hourly.time.slice(0, 24);
      weatherLabels = formatTimeLabels(hours);
      temps = weatherResp.hourly.temperature_2m.slice(0, 24);
      currentTemp = weatherResp.current_weather?.temperature || temps[0] || null;
    }
    
    // Generate traffic and energy data
    const trafficData = generateTrafficData(weatherResp, 24);
    const energyData = generateEnergyData(weatherResp, 24);
    const trafficLabels = weatherLabels.length ? weatherLabels : Array.from({ length: 24 }, (_, i) => {
      const hour = (new Date().getHours() + i) % 24;
      return `${hour.toString().padStart(2, '0')}:00`;
    });
    
    // Render charts
    console.log('Chart data - PM2.5:', pm25Data.length, 'PM10:', pm10Data.length, 'Labels:', labels.length);
    
    if (pm25Data.length || pm10Data.length) {
      renderAQChart(labels.length > 0 ? labels : ['Current'], pm25Data.length > 0 ? pm25Data : [0], pm10Data.length > 0 ? pm10Data : [0]);
    } else {
      console.warn('No air quality data to render chart');
      // Render empty chart with message
      renderAQChart(['No Data'], [0], [0]);
    }
    
    if (temps.length) {
      renderWeatherChart(weatherLabels, temps);
    }
    
    renderTrafficChart(trafficLabels, trafficData);
    renderEnergyChart(trafficLabels, energyData);
    
    // Update metrics
    const avgPM25 = pm25Data.length ? pm25Data.reduce((a, b) => a + b, 0) / pm25Data.length : currentPM25;
    const avgPM10 = pm10Data.length ? pm10Data.reduce((a, b) => a + b, 0) / pm10Data.length : currentPM10;
    updateMetrics({ aqi: currentAQI, pm25: avgPM25, pm10: avgPM10 }, currentTemp, trafficData, energyData);
    
    // Generate insights
    const insights = [];
    insights.push(`📍 <strong>Location:</strong> ${currentCity} (${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E)`);
    
    if (currentAQI !== null || avgPM25 !== null || avgPM10 !== null) {
      const aqi = calculateAQI(currentAQI, avgPM25, avgPM10);
      const aqiSource = airPollutionResp?.source === 'api-ninjas' ? 'API Ninjas (Live)' :
                       (airPollutionResp?.source === 'aqicn' ? 'AQICN (Live)' :
                       (airPollutionResp?.source === 'nyc-open-data' ? 'NYC Open Data' : 
                       (airPollutionResp?.current || airPollutionResp?.hourly ? 'Open-Meteo' : 
                       (airPollutionResp?.results && !airPollutionResp?.source ? 'OpenAQ' : 'Calculated'))));
      insights.push(`🌬️ <strong>Air Quality:</strong> ${aqi.label} (AQI: ${aqi.value}) [${aqiSource}]`);
      if (currentPM25 !== null) {
        insights.push(`📊 <strong>PM2.5:</strong> ${currentPM25.toFixed(1)} µg/m³`);
      }
      if (currentPM10 !== null) {
        insights.push(`📊 <strong>PM10:</strong> ${currentPM10.toFixed(1)} µg/m³`);
      }
      if (aqi.value > 100) {
        insights.push(`⚠️ <strong>Health Alert:</strong> Air quality is ${aqi.label.toLowerCase()}. Sensitive groups should limit outdoor activities.`);
      }
    } else {
      insights.push(`🌬️ <strong>Air Quality:</strong> No recent data available for this location.`);
      insights.push(`💡 <strong>Tip:</strong> Try a major city name. Air quality data may not be available for all locations.`);
      insights.push(`🔍 <strong>Debug:</strong> Check browser console (F12) for detailed API response logs.`);
    }
    
    if (currentTemp !== null) {
      insights.push(`🌡️ <strong>Current Temperature:</strong> ${Math.round(currentTemp)}°C`);
      if (currentTemp > 30) {
        insights.push(`☀️ <strong>Weather Note:</strong> High temperature detected. Stay hydrated and avoid prolonged sun exposure.`);
      } else if (currentTemp < 10) {
        insights.push(`❄️ <strong>Weather Note:</strong> Low temperature. Dress warmly and be cautious of icy conditions.`);
      }
    }
    
    const avgTraffic = trafficData.reduce((a, b) => a + b, 0) / trafficData.length;
    insights.push(`🚦 <strong>Traffic Density:</strong> Average ${Math.round(avgTraffic)}% (${avgTraffic >= 80 ? 'Heavy' : avgTraffic >= 60 ? 'Moderate' : 'Light'})`);
    
    const avgEnergy = energyData.reduce((a, b) => a + b, 0) / energyData.length;
    insights.push(`⚡ <strong>Energy Consumption:</strong> Average index ${Math.round(avgEnergy)} (${avgEnergy >= 70 ? 'High' : avgEnergy >= 50 ? 'Normal' : 'Low'})`);
    
    insights.push(`🔄 <strong>Data Status:</strong> ${autoRefreshToggle.checked ? 'Auto-refresh enabled (60s interval)' : 'Auto-refresh disabled'}`);
    
    updateInsights(insights);
    
    // Update last refresh time
    lastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    
  } catch (err) {
    console.error('Error loading city data:', err);
    updateInsights([
      `❌ <strong>Error:</strong> ${err.message || 'Failed to load data. Please check your internet connection and try again.'}`,
      `💡 <strong>Tip:</strong> Try entering a major city name (e.g., "Delhi", "London", "New York")`
    ]);
  } finally {
    loader.style.display = 'none';
    loadBtn.disabled = false;
  }
}

// Auto-refresh functionality
async function startAutoRefresh(cityName) {
  if (refreshInterval) clearInterval(refreshInterval);
  
  await loadAllForCity(cityName);
  
  if (autoRefreshToggle.checked) {
    refreshInterval = setInterval(() => {
      if (autoRefreshToggle.checked) {
        loadAllForCity(cityName);
      }
    }, 60000); // 60 seconds
  }
}

// Event Listeners
loadBtn.addEventListener('click', () => {
  const city = cityInput.value.trim() || 'Delhi';
  startAutoRefresh(city);
});

cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const city = cityInput.value.trim() || 'Delhi';
    startAutoRefresh(city);
  }
});

autoRefreshToggle.addEventListener('change', (e) => {
  if (e.target.checked && currentCity) {
    startAutoRefresh(currentCity);
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
});

// Initial load
window.addEventListener('load', () => {
  startAutoRefresh(cityInput.value || 'Delhi');
});
