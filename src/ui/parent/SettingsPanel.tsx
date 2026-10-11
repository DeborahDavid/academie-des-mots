import { useRef, useState } from 'react';
import { backupToJson, exportData, importData, parseBackup } from '../../db/backup';
import { updateSettings } from '../../db/repo';
import { MOON_PHASES } from '../../domain/moon';
import { hashPin, isValidPin, newSalt } from '../../domain/pin';
import { useSettings } from '../hooks';

export function SettingsPanel() {
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [pin, setPin] = useState('');

  if (!settings) return null;

  async function doExport() {
    const json = backupToJson(await exportData());
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `academie-des-mots-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Sauvegarde téléchargée.');
  }

  async function doImport(file: File) {
    try {
      const backup = parseBackup(await file.text());
      if (!confirm(`Remplacer TOUTES les données actuelles par la sauvegarde du ${new Date(backup.exportedAt).toLocaleString('fr-FR')} ?`)) return;
      await importData(backup);
      setMessage('Sauvegarde restaurée.');
    } catch (e) {
      setMessage(`Import impossible : ${(e as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function changePin() {
    if (!isValidPin(pin)) return setMessage('Le code doit faire 4 à 6 chiffres.');
    const salt = newSalt();
    await updateSettings({ pinSalt: salt, pinHash: await hashPin(pin, salt) });
    setPin('');
    setMessage('Code modifié.');
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>Sauvegarde</h2>
        <p className="muted small-text">
          Toutes les données restent dans ce navigateur, sur cet ordinateur. Exportez régulièrement : vider les données du navigateur les
          effacerait. L’export permet aussi de passer sur un autre appareil.
        </p>
        <div className="row">
          <button className="primary" onClick={doExport}>
            Exporter (JSON)
          </button>
          <button onClick={() => fileRef.current?.click()}>Importer…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
      </section>

      <section className="card stack">
        <h2>Code parent</h2>
        <div className="row">
          <input type="password" inputMode="numeric" maxLength={6} placeholder="Nouveau code" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <button onClick={changePin}>Changer</button>
        </div>
      </section>

      <section className="card">
        <h2>Lune</h2>
        <p className="muted small-text">
          Phase actuelle : <strong>{MOON_PHASES[settings.moonPhase]}</strong>. Elle avance à chaque nouvelle liste.
        </p>
      </section>

      <p className="muted small-text">
        Version du {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
      </p>

      {message && <p className="notice">{message}</p>}
    </div>
  );
}
