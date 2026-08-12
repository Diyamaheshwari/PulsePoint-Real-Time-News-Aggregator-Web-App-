import React from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './app/store';
import { ThemeProvider } from './context/ThemeContext';
import AlertState from './context/alert/AlertState';
import { NewsProvider } from './context/NewsContext';
import { CommunityProvider } from './context/CommunityContext';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

if (typeof window !== 'undefined') {
  window.axios = axios;
}

const defaultBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');
axios.defaults.baseURL = defaultBaseUrl.endsWith('/api') ? defaultBaseUrl.slice(0, -4) : defaultBaseUrl;

const root = createRoot(document.getElementById('root'));

const AppWithProviders = () => (
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <ThemeProvider>
            <AlertState>
              <AuthProvider>
                <NewsProvider>
                  <CommunityProvider>
                    <App />
                  </CommunityProvider>
                </NewsProvider>
              </AuthProvider>
            </AlertState>
          </ThemeProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

root.render(<AppWithProviders />);

// Unregister stale PWA Service Workers to ensure fresh production assets are always served directly from Vercel
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
  if (window.caches) {
    caches.keys().then((names) => {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
}