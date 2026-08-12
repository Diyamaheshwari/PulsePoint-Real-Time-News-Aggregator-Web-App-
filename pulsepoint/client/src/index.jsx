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

// Register PWA Service Worker for production caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('PWA Service Worker registered with scope:', reg.scope))
      .catch(err => console.error('PWA Service Worker registration failed:', err));
  });
}