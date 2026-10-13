import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@wishflow/site-shell';
import './locales';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);
