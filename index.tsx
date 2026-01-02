import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// The demo orchestration logic is now triggered by user action within the Dashboard.
// demoExecution();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <div style={{ padding: 10, border: '1px solid red' }}>
      <h1>System Status: Online</h1>
      <App />
    </div>
  </React.StrictMode>
);