import { useState } from 'react';
import { WeeksPanel } from './WeeksPanel';
import { NotionsPanel } from './NotionsPanel';
import { VoicePanel } from './VoicePanel';
import { SettingsPanel } from './SettingsPanel';

const TABS = [
  { id: 'weeks', label: 'Listes de mots' },
  { id: 'notions', label: 'Notions' },
  { id: 'voice', label: 'Voix' },
  { id: 'settings', label: 'Réglages & sauvegarde' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function ParentApp({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<TabId>('weeks');
  return (
    <div className="parent">
      <header>
        <h1>Mode parent</h1>
        <button className="ghost" onClick={onExit}>
          Quitter
        </button>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'weeks' && <WeeksPanel />}
      {tab === 'notions' && <NotionsPanel />}
      {tab === 'voice' && <VoicePanel />}
      {tab === 'settings' && <SettingsPanel />}
    </div>
  );
}
