const apiKey = "62b039f8311079712478a1f47699e0e4";
const currentLocBtn = document.getElementById("current_loc-btn");
const searchBtn = document.getElementById("searchbtn");
const cityInput = document.getElementById("city_input");

// Selectors for updating weather details
const forecastCity = document.querySelector(".current-weather .details p");
const temperature = document.querySelector(".current-weather .details h2");
const weatherIcon = document.querySelector(".current-weather .weather-icon img");
const cardFooter = document.querySelector(".card-footer p");
const sunriseTime = document.getElementById("sunrise-time");
const sunsetTime = document.getElementById("sunset-time");

// Weather details
const visibility = document.getElementById("visibility");
const dewPoint = document.getElementById("dew-point");
const wind = document.getElementById("wind");
const humidity = document.getElementById("humidity");
const clouds = document.getElementById("clouds");

// 5-day forecast container
const forecastContainer = document.querySelector(".day-forecast");

// Utility function: Fetch data
const fetchData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Unable to fetch weather data. Please try again later.");
  }
};

// Utility function: Convert Unix timestamp to readable time
const convertToTime = (timestamp, timezone) => {
  const date = new Date((timestamp + timezone) * 1000);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

// Utility function: Get day of the week
const getDayOfWeek = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const options = { weekday: "long" };
  return date.toLocaleDateString("en-US", options); // Returns day like 'Monday'
};

// Utility function: Check for special weather conditions for low temperatures
const getWeatherConditionMessage = (weather, temp) => {
  if (temp < 10) {
    if (weather.includes("haze")) return "Haze conditions observed, low visibility.";
    if (weather.includes("fog")) return "Foggy weather, be cautious!";
    if (weather.includes("mist")) return "Mist in the air, low visibility.";
    return "Cold temperatures with low visibility.";
  }
  return "";
};

// Update weather details in UI
const updateWeatherUI = (data) => {
  const { name, weather, main, wind: windData, visibility: vis, clouds: cloudData, sys, timezone } = data;

  // Make sure the country is fetched correctly
  const country = sys.country ? sys.country : "Unknown";  // Fallback if no country is found

  forecastCity.textContent = `Forecast in ${name}, ${country}`; // Show city and country
  temperature.innerHTML = `${Math.round(main.temp)}&deg;C`;
  weatherIcon.src = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
  cardFooter.textContent = `${getDayOfWeek(new Date().getTime() / 1000)} - ${new Date().toLocaleDateString()}`; // Display the current day

  // Special condition for low temperatures
  const conditionMessage = getWeatherConditionMessage(weather[0].description, main.temp);
  if (conditionMessage) {
    cardFooter.textContent += ` - ${conditionMessage}`;
  }

  visibility.textContent = (vis / 1000).toFixed(1); // Convert visibility from meters to kilometers
  dewPoint.textContent = "N/A"; // OpenWeatherMap doesn't provide dew point in current API
  wind.textContent = windData.speed;
  humidity.textContent = main.humidity;
  clouds.textContent = cloudData.all;

  sunriseTime.textContent = convertToTime(sys.sunrise, timezone);
  sunsetTime.textContent = convertToTime(sys.sunset, timezone);
};

// Update 5-day forecast
const updateForecast = (forecastData) => {
  forecastContainer.innerHTML = ""; // Clear existing forecast

  forecastData.forEach((day) => {
    const { dt, main, weather } = day;
    const forecastItem = document.createElement("div");
    forecastItem.classList.add("forecast-item");

    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}.png`;

    forecastItem.innerHTML = `
      <div class="icon-wrapper">
        <img src="${iconUrl}" alt="${weather[0].description}">
        <span>${Math.round(main.temp)}&deg;C</span>
      </div>
      <p>${getDayOfWeek(dt)} - ${new Date(dt * 1000).toLocaleDateString()}</p>
      <p>${weather[0].description}</p>
    `;

    forecastContainer.appendChild(forecastItem);
  });
};

// Fetch current weather by city name
const fetchWeatherByCity = async (city) => {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
  const data = await fetchData(url);
  if (data) {
    updateWeatherUI(data);
    localStorage.setItem("lastLocation", JSON.stringify({ type: "city", value: city }));

    // Fetch 5-day forecast
    fetchForecast(city);
  }
};

// Fetch current weather by coordinates
const fetchWeatherByCoords = async (lat, lon) => {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const data = await fetchData(url);
  if (data) {
    updateWeatherUI(data);
    localStorage.setItem("lastLocation", JSON.stringify({ type: "coords", value: { lat, lon } }));

    // Fetch 5-day forecast
    fetchForecastByCoords(lat, lon);
  }
};

// Fetch 5-day weather forecast by city name
const fetchForecast = async (city) => {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`;
  const data = await fetchData(url);
  if (data) {
    updateForecast(data.list.filter((item, index) => index % 8 === 0)); // Filter to show one forecast per day
  }
};

// Fetch 5-day weather forecast by coordinates
const fetchForecastByCoords = async (lat, lon) => {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const data = await fetchData(url);
  if (data) {
    updateForecast(data.list.filter((item, index) => index % 8 === 0)); // Filter to show one forecast per day
  }
};

// Get current location
const getCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to fetch current location. Please enable location access.");
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
};

// Load last location from local storage
const loadLastLocation = () => {
  const lastLocation = JSON.parse(localStorage.getItem("lastLocation"));
  if (lastLocation) {
    if (lastLocation.type === "city") {
      fetchWeatherByCity(lastLocation.value);
    } else if (lastLocation.type === "coords") {
      const { lat, lon } = lastLocation.value;
      fetchWeatherByCoords(lat, lon);
    }
  } else {
    // Default to a city if no previous location is found
    fetchWeatherByCity("New York");
  }
};

// Event listeners
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) {
    fetchWeatherByCity(city);
  } else {
    alert("Please enter a city name.");
  }
});

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) {
      fetchWeatherByCity(city);
    } else {
      alert("Please enter a city name.");
    }
  }
});

currentLocBtn.addEventListener("click", getCurrentLocation);

// Initialize app
window.addEventListener("DOMContentLoaded", loadLastLocation);
