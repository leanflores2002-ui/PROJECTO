import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './ui.css';
import './admin-ux.css';
import './romix-admin.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
import './admin-accessible.css';
import './admin-sections.css';
