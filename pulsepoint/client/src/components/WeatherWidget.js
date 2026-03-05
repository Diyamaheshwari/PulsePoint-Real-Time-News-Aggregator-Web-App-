import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, CircularProgress, IconButton } from '@mui/material';
import { LocationOn, AccessTime, Refresh, WaterDrop, Air } from '@mui/icons-material';
import axios from 'axios';

// Map of country codes to their capital cities
const capitalCities = {
  us: 'Washington, D.C.',
  in: 'New Delhi',
  gb: 'London',
  ca: 'Ottawa',
  au: 'Canberra',
  de: 'Berlin',
  fr: 'Paris',
  jp: 'Tokyo',
  cn: 'Beijing',
  ru: 'Moscow',
  br: 'Brasília',
  za: 'Pretoria',
  eg: 'Cairo',
  mx: 'Mexico City',
  it: 'Rome',
  es: 'Madrid',
  nl: 'Amsterdam',
  se: 'Stockholm',
  ch: 'Bern',
  no: 'Oslo',
  dk: 'Copenhagen',
  fi: 'Helsinki',
  pl: 'Warsaw',
  tr: 'Ankara',
  sa: 'Riyadh',
  ae: 'Abu Dhabi',
  kr: 'Seoul',
  sg: 'Singapore',
  id: 'Jakarta',
  th: 'Bangkok',
  vn: 'Hanoi',
  my: 'Kuala Lumpur',
  ph: 'Manila',
  nz: 'Wellington',
  ar: 'Buenos Aires',
  cl: 'Santiago',
  co: 'Bogotá',
  pe: 'Lima',
  ve: 'Caracas',
  ng: 'Abuja',
  ke: 'Nairobi',
  za: 'Pretoria',
  dz: 'Algiers',
  ma: 'Rabat',
  il: 'Jerusalem',
  eg: 'Cairo',
  ir: 'Tehran',
  iq: 'Baghdad',
  kw: 'Kuwait City',
  qa: 'Doha',
  bh: 'Manama',
  om: 'Muscat',
  jo: 'Amman',
  lb: 'Beirut',
  sy: 'Damascus',
  ye: 'Sana\'a',
  pk: 'Islamabad',
  af: 'Kabul',
  bd: 'Dhaka',
  lk: 'Colombo',
  np: 'Kathmandu',
  bt: 'Thimphu',
  mv: 'Malé',
  la: 'Vientiane',
  kh: 'Phnom Penh',
  mm: 'Naypyidaw',
  bn: 'Bandar Seri Begawan',
  tl: 'Dili',
  pg: 'Port Moresby',
  fj: 'Suva',
  sb: 'Honiara',
  vu: 'Port Vila',
  ws: 'Apia',
  to: 'Nuku\'alofa',
  nr: 'Yaren',
  ki: 'South Tarawa',
  tv: 'Funafuti',
  mh: 'Majuro',
  fm: 'Palikir',
  pw: 'Ngerulmud',
  sb: 'Honiara',
  pg: 'Port Moresby',
  fj: 'Suva',
  nz: 'Wellington',
  au: 'Canberra',
  pg: 'Port Moresby',
  sb: 'Honiara',
  vu: 'Port Vila',
  fj: 'Suva',
  nz: 'Wellington',
  au: 'Canberra'
};

const WeatherWidget = ({ country = 'us', selectedCity = null }) => {
  const [city, setCity] = useState(selectedCity || capitalCities[country] || 'London');
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(capitalCities[country] || 'New York');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchWeather = useCallback(async (countryCode) => {
    const city = capitalCities[countryCode] || 'New York';
    setLocation(city);
    try {
      setLoading(true);
      // Use the selected city if provided, otherwise use capital city for the country
      const targetCity = selectedCity || capitalCities[country] || 'London';
      setCity(targetCity);
      
      const response = await axios.get(`/api/weather`, {
        params: {
          city: targetCity,
          country: country.toLowerCase()
        },
        timeout: 10000,
        withCredentials: true
      });
      
      const weatherData = {
        temp: Math.round(response.data.temperature),
        feels_like: Math.round(response.data.feels_like),
        condition: response.data.description,
        icon: response.data.icon,
        location: response.data.city,
        country: response.data.country,
        humidity: response.data.humidity,
        wind_speed: response.data.wind_speed,
        time: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        day: new Date().toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        })
      };
      
      setWeather(weatherData);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError(err.response?.data?.error || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [country, selectedCity]);

  useEffect(() => {
    fetchWeather(country);
    // Set up refresh interval (every 30 minutes)
    const interval = setInterval(() => fetchWeather(country), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [country, fetchWeather]);

  if (loading) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          minWidth: 250
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={100}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minWidth: 250,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Box display="flex" alignItems="center">
            <Typography variant="h4" component="div" fontWeight="bold" sx={{ mr: 1 }}>
              {weather.temp}°
            </Typography>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Feels like {weather.feels_like}°
              </Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {weather.condition}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <LocationOn color="primary" sx={{ mr: 1, flexShrink: 0 }} />
              <Typography variant="h6" component="div" noWrap>
                {weather?.location || city}, {weather?.country || country.toUpperCase()}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {weather.icon && (
          <Box>
            <img 
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
              alt={weather.condition}
              style={{ width: 60, height: 60, marginTop: -15 }}
            />
          </Box>
        )}
      </Box>
      
      <Box display="flex" justifyContent="space-between" mt={2} pt={2} borderTop={1} borderColor="divider">
        <Box textAlign="center">
          <WaterDrop color="primary" fontSize="small" />
          <Typography variant="caption" display="block" color="primary" fontWeight="medium">
            {weather.humidity}%
          </Typography>
          <Typography variant="caption" color="textSecondary">Humidity</Typography>
        </Box>
        <Box textAlign="center">
          <Air color="primary" fontSize="small" />
          <Typography variant="caption" display="block" color="primary" fontWeight="medium">
            {weather.wind_speed} m/s
          </Typography>
          <Typography variant="caption" color="textSecondary">Wind</Typography>
        </Box>
        <Box textAlign="center">
          <AccessTime color="primary" fontSize="small" />
          <Typography variant="caption" display="block" color="primary" fontWeight="medium">
            {weather.time}
          </Typography>
          <Typography variant="caption" color="textSecondary">Updated</Typography>
        </Box>
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Box display="flex" alignItems="center">
          <AccessTime color="action" fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            {weather.day}, {weather.time}
          </Typography>
        </Box>
        <IconButton 
          onClick={() => fetchWeather(country)} 
          disabled={loading}
          size="small"
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            color: 'white'
          }}
        >
          <Refresh fontSize="small" />
        </IconButton>
      </Box>
      {lastUpdated && (
        <Typography variant="caption" color="text.disabled" display="block" textAlign="right" mt={0.5}>
          Updated: {lastUpdated}
        </Typography>
      )}
    </Paper>
  );
};

export default WeatherWidget;
