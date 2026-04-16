import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Load Google Maps API
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
script.async = true;
document.head.appendChild(script);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
