import { type FormEvent, useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../db/repo';
import { hashPin, isValidPin, newSalt } from '../../domain/pin';

interface Props {
  onUnlock: () => void;
  onCancel: () => void;
}

export function ParentGate({ onUnlock, onCancel }: Props) {
  const [mode, setMode] = useState<'loading' | 'create' | 'enter'>('loading');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then((s) => setMode(s.pinHash ? 'enter' : 'create'));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const s = await getSettings();
    if (mode === 'create') {
      if (!isValidPin(pin)) return setError('Le code doit faire 4 à 6 chiffres.');
      if (pin !== confirm) return setError('Les deux codes ne correspondent pas.');
      const salt = newSalt();
      await updateSettings({ pinSalt: salt, pinHash: await hashPin(pin, salt) });
      onUnlock();
    } else {
      if ((await hashPin(pin, s.pinSalt ?? '')) === s.pinHash) onUnlock();
      else {
        setError('Code incorrect.');
        setPin('');
      }
    }
  }

  if (mode === 'loading') return null;

  return (
    <main className="pin-screen">
      <form className="card pin-box stack" onSubmit={submit}>
        <h2>Mode parent</h2>
        {mode === 'create' && <p className="muted small-text">Choisissez un code (4 à 6 chiffres) que Leyu ne connaît pas.</p>}
        <input
          className="pin-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          aria-label="Code"
        />
        {mode === 'create' && (
          <input
            className="pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
            aria-label="Confirmer le code"
            placeholder="confirmer"
          />
        )}
        {error && <p className="warn">{error}</p>}
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="ghost" onClick={onCancel}>
            Retour
          </button>
          <button type="submit" className="primary">
            {mode === 'create' ? 'Créer le code' : 'Entrer'}
          </button>
        </div>
      </form>
    </main>
  );
}
