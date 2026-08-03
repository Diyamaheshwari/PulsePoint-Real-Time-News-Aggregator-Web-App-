import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      // Force Babel JSX transform on all .js files inside src/
      // so Rolldown never sees raw JSX tokens in .js files.
      include: /\.(js|jsx|ts|tsx)$/,
    }),
  ],
  // Shim process.env for CRA-style references throughout the codebase
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.REACT_APP_API_URL': JSON.stringify('http://localhost:5000/api'),
    'process.env.REACT_APP_WS_URL': JSON.stringify('http://localhost:5000'),
    'process.env.REACT_APP_GNEWS_API_KEY': JSON.stringify('78851e057c859675d6bf620dabbd142f'),
    'process.env.REACT_APP_NEWSAPI_API_KEY': JSON.stringify('12d26136a2d8413f9f2157d9b8230b0f'),
    'process.env.REACT_APP_NEWSAPI_BASE_URL': JSON.stringify('https://newsapi.org/v2'),
    'process.env.REACT_APP_OPENWEATHER_API_KEY': JSON.stringify('99cdd465fe68792ecaa5e3ccf85620ac'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
