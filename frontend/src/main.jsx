import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ── Datadog Real User Monitoring ──────────────────────────────
datadogRum.init({
  applicationId: 'a35f3ad0-0141-4502-b5e4-10f8eb78114b',
  clientToken: 'pub819d31df5720552a8f553d3213e05f8f',
  site: 'datadoghq.com',
  service: 'smartnest',
  env: import.meta.env.MODE === 'production' ? 'production' : 'development',
  version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackResources: true,
  trackUserInteractions: true,
  trackLongTasks: true,
  plugins: [reactPlugin({ router: false })],
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
