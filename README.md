# 🏙️ Smart City Data Dashboard

A comprehensive, real-time smart city dashboard that visualizes urban data including air quality, weather, traffic density, and energy consumption. Built with vanilla HTML, CSS, and JavaScript using Chart.js for data visualization.

## ✨ Features

- **🌬️ Air Quality Monitoring**: Live AQI data for different cities and states with real-time PM2.5 and PM10 levels
- **🌡️ Weather Forecast**: 24-hour temperature forecasts using OpenWeatherMap API
- **🚦 Traffic Density**: Simulated traffic patterns based on time and weather conditions
- **⚡ Energy Consumption**: Estimated energy index based on temperature and time patterns
- **📊 Interactive Charts**: Beautiful, responsive charts using Chart.js
- **🔄 Real-time Updates**: Auto-refresh every 60 seconds (toggleable)
- **📍 Multi-City Support**: Search and visualize data for any city worldwide
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: Chart.js 4.4.0
- **HTTP Client**: Axios
- **APIs Used**:
  - API Ninjas Air Quality API (Air Quality - Primary) - Supports city names, no API key required for limited use
  - AQICN/World Air Quality Index (Air Quality - Fallback) - Supports cities and coordinates globally
  - Open-Meteo Air Quality API (Air Quality - Fallback) - Works globally with coordinates
  - OpenWeatherMap Weather API (Weather) - API key included
  - OpenAQ (Air Quality - Final Fallback) - No API key required
  - Open-Meteo Weather API (Weather Fallback) - No API key required
  - Nominatim/OpenStreetMap (Geocoding) - No API key required

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls
- No build tools or dependencies required!

### Installation

1. Clone or download this repository:
   ```bash
   git clone <repository-url>
   cd smart-city-dashboard
   ```

2. Open `index.html` in your web browser:
   - Simply double-click the file, or
   - Use a local server (recommended):
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js (http-server)
     npx http-server
     
     # Then visit http://localhost:8000
     ```

3. Enter a city name (e.g., "Delhi", "London", "New York") and click "Load Data"

## 📡 API Configuration

### API Keys

The dashboard uses live AQI APIs that support multiple cities and states. The weather API key is already configured in `script.js`:

```javascript
const WEATHER_API_KEY = '3c8ffd7f7339a065c6ce070bc0601a93'; // OpenWeatherMap
```

**Note**: 
- **Air Quality**: Uses API Ninjas and AQICN APIs that support city names directly (no API key required for limited use)
  - Works with city names like "New York", "Los Angeles", "Delhi", "London", etc.
  - Supports cities across different states and countries
- **Weather**: If you want to use your own OpenWeatherMap API key:
  1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
  2. Get your free API key
  3. Replace the key in `script.js`

The dashboard automatically falls back to:
- AQICN (for air quality) if API Ninjas fails
- Open-Meteo Air Quality API (for air quality) if both API Ninjas and AQICN fail
- OpenAQ (for air quality) if all other APIs fail
- Open-Meteo Weather (for weather) if OpenWeatherMap Weather API fails

## 📊 Data Sources

### Real Data APIs

1. **API Ninjas Air Quality API** - Air Quality (Primary)
   - Supports city names directly (e.g., "New York", "Los Angeles", "Delhi")
   - Provides live AQI, PM2.5, PM10, CO, NO₂, O₃, SO₂
   - Works for cities across different states and countries
   - No API key required for limited use (or add your key for more requests)

2. **AQICN/World Air Quality Index** - Air Quality (Fallback)
   - Supports city names and geographic coordinates
   - Provides real-time AQI data for 1000+ cities globally
   - Works with city names or coordinates
   - No API key required (demo token included)

3. **Open-Meteo Air Quality API** - Air Quality (Fallback)
   - Provides AQI (US AQI and European AQI), PM2.5, PM10, and other pollutants
   - 5-day forecast with hourly data available
   - No API key required (free)
   - Global coverage based on CAMS forecasts

4. **OpenAQ** - Air Quality (Final Fallback)
   - Provides PM2.5 and PM10 measurements
   - No API key required
   - Used if OpenWeatherMap fails

5. **OpenWeatherMap** - Weather
   - 24-hour forecast
   - Current temperature
   - Requires API key (included)

6. **Open-Meteo** - Weather (Fallback)
   - Used if OpenWeatherMap fails
   - No API key required

7. **Nominatim/OpenStreetMap** - Geocoding
   - Converts city names to coordinates
   - No API key required

### Simulated Data

- **Traffic Density**: Simulated based on time patterns (rush hours, off-peak)
- **Energy Consumption**: Estimated based on temperature and time of day

## 🎨 Dashboard Components

### Key Metrics Cards
- Air Quality Index (AQI) with color-coded status
- Current Temperature
- Average Traffic Density
- Energy Consumption Index

### Charts
- **Air Quality Trends**: Line chart showing PM2.5 and PM10 over time
- **Weather Forecast**: 24-hour temperature forecast
- **Traffic Density**: Bar chart showing traffic patterns
- **Energy Consumption**: Line chart showing energy index trends

### Insights Panel
- Location coordinates
- Air quality health alerts
- Weather recommendations
- Traffic and energy summaries
- Data refresh status

## 🧪 Testing with Postman

A Postman collection is included (`postman_collection.json`) for testing API endpoints:

1. Import `postman_collection.json` into Postman
2. Test individual API endpoints
3. Understand the data structure before using in the dashboard

### Collection Includes:
- Open-Meteo Air Quality (current & hourly) endpoint
- OpenWeatherMap Weather Forecast endpoint
- OpenAQ measurements endpoint (fallback)
- Open-Meteo Weather forecast endpoint (fallback)
- Nominatim geocoding endpoint

## 📱 Usage

1. **Load City Data**:
   - Enter a city name in the search box
   - Click "Load Data" or press Enter
   - Wait for data to load (usually 2-3 seconds)

2. **Auto-Refresh**:
   - Toggle the "Auto-refresh (60s)" checkbox
   - When enabled, data updates automatically every 60 seconds
   - Last update time is displayed in the header

3. **View Insights**:
   - Scroll to the "Comprehensive Insights" section
   - View detailed analysis and recommendations
   - Health alerts for poor air quality
   - Weather and traffic recommendations

## 🎯 Features in Detail

### Air Quality Index (AQI)
- Uses live AQI APIs that support multiple cities and states
- Primary: API Ninjas Air Quality API (supports city names directly)
- Fallback: AQICN World Air Quality Index (supports cities and coordinates globally)
- AQI scale: Supports US AQI (0-500) with automatic conversion to 1-5 scale
- Includes PM2.5, PM10, CO, NO₂, O₃, SO₂ and other pollutants
- Real-time data for cities across different states and countries
- Color-coded status: Good, Fair, Moderate, Poor, Very Poor
- Health alerts for sensitive groups
- Falls back to Open-Meteo Air Quality API, then OpenAQ if primary APIs unavailable

### Weather Integration
- Uses OpenWeatherMap API (primary)
- Falls back to Open-Meteo if needed
- Shows current temperature and 24-hour forecast

### Traffic Simulation
- Models rush hour patterns (7-9 AM, 5-7 PM)
- Lower traffic during night hours
- Visual indicators: Light, Moderate, Heavy

### Energy Consumption
- Estimates based on temperature extremes
- Higher consumption during peak hours
- Adjusts for heating/cooling needs

## 🔧 Customization

### Change Refresh Interval
Edit `script.js`:
```javascript
refreshInterval = setInterval(() => {
  // Change 60000 to desired milliseconds (e.g., 30000 for 30 seconds)
}, 60000);
```

### Add More Metrics
1. Add new API calls in `loadAllForCity()`
2. Create new chart rendering functions
3. Add metric cards in `index.html`
4. Update CSS for styling

### Modify Color Scheme
Edit CSS variables in `style.css`:
```css
:root {
  --accent: #2563eb;  /* Change primary color */
  --success: #10b981; /* Change success color */
  /* ... */
}
```

## 🐛 Troubleshooting

### No Data Loading
- Check internet connection
- Verify city name spelling
- Check browser console for errors
- Ensure APIs are accessible (some may be blocked by CORS)

### Charts Not Displaying
- Ensure Chart.js CDN is loading (check Network tab)
- Verify canvas elements exist in HTML
- Check browser console for JavaScript errors

### API Errors
- Open-Meteo Air Quality: Usually works without issues (no API key needed)
- OpenWeatherMap Weather: Verify API key is valid
- OpenAQ: Check if location has air quality stations nearby (fallback only)
- Geocoding: Try a more specific city name

## 📝 Project Structure

```
smart-city-dashboard/
├── index.html          # Main HTML structure
├── style.css           # Styling and responsive design
├── script.js           # JavaScript logic and API calls
├── postman_collection.json  # Postman API collection
└── README.md           # This file
```

## 🌟 Future Enhancements

- [ ] Add more real-time data sources (waste management, public transport)
- [ ] Historical data comparison
- [ ] Multiple city comparison view
- [ ] Export data to CSV/JSON
- [ ] Dark mode toggle
- [ ] Push notifications for alerts
- [ ] Map visualization integration
- [ ] User preferences and saved cities

## 📄 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

- [Open-Meteo](https://open-meteo.com/) - Air Quality and Weather data
- [OpenWeatherMap](https://openweathermap.org/) - Weather data
- [OpenAQ](https://openaq.org/) - Air quality data (fallback)
- [Open-Meteo](https://open-meteo.com/) - Weather fallback
- [Chart.js](https://www.chartjs.org/) - Chart library
- [Nominatim](https://nominatim.org/) - Geocoding service

## 📧 Support

For issues or questions:
1. Check the browser console for errors
2. Review API documentation
3. Test endpoints in Postman
4. Ensure all files are in the same directory

---

**Built with ❤️ for Smart City Analytics**
