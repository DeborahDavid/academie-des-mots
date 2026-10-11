import { useRef, useState } from 'react';

interface Props {
  hasAudio: boolean;
  onSave: (blob: Blob) => void;
  onClear: () => void;
}

/** Enregistrement micro (voix du parent). Dire le mot. */
export function Recorder({ hasAudio, onSave, onClear }: Props) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onSave(new Blob(chunks, { type: rec.mimeType }));
        setRecording(false);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      alert('Micro inaccessible. Autorisez le micro pour ce site dans le navigateur.');
    }
  }

  if (recording)
    return (
      <button className="small" onClick={() => recRef.current?.stop()} title="Arrêter l’enregistrement">
        <span className="rec-dot" />
        Stop
      </button>
    );

  return (
    <>
      <button className="small" onClick={start} title={hasAudio ? 'Réenregistrer votre voix' : 'Enregistrer votre voix (phrase puis mot)'}>
        ⏺
      </button>
      {hasAudio && (
        <button className="small ghost" onClick={() => confirm('Supprimer l’enregistrement ?') && onClear()} title="Revenir à la synthèse vocale">
          ⌫
        </button>
      )}
    </>
  );
}
