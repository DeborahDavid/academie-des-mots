import { useState } from 'react';
import { navigate, useHashRoute } from './router';
import { ChildHome } from './ui/child/ChildHome';
import { ParentGate } from './ui/parent/ParentGate';
import { ParentApp } from './ui/parent/ParentApp';

export function App() {
  const route = useHashRoute();
  // Le déverrouillage parent ne survit pas à un rechargement.
  const [unlocked, setUnlocked] = useState(false);

  if (route.startsWith('parent')) {
    if (!unlocked) return <ParentGate onUnlock={() => setUnlocked(true)} onCancel={() => navigate('')} />;
    return (
      <ParentApp
        onExit={() => {
          setUnlocked(false);
          navigate('');
        }}
      />
    );
  }
  return <ChildHome />;
}
