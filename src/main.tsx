import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import './styles.css';
import './styles/home.css';
import { App } from './App';
import { ensureSeeded } from './db/repo';
import { ensureVocabSeeded } from './db/vocabRepo';
import { reloadIfOutdated } from './updateCheck';

reloadIfOutdated()
  // Si une nouvelle version se charge, on n'affiche rien de l'ancienne.
  .then((reloading) => (reloading ? new Promise<void>(() => {}) : ensureSeeded().then(() => ensureVocabSeeded())))
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
