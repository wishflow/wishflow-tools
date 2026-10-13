import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@wishflow/site-shell';
import './locales';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('页面根节点不存在。');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
