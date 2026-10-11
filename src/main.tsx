import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import './styles.css';
import { App } from './App';
import { ensureSeeded } from './db/repo';

ensureSeeded().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
