import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import MainApp from './App';
import logPerformance from './reportWebVitals';

const container = ReactDOM.createRoot(document.getElementById('root'));
container.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
logPerformance();