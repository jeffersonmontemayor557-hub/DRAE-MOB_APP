import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import CdrrmoStartupLoader, { STARTUP_LOADER_MS } from './components/CdrrmoStartupLoader';

function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), STARTUP_LOADER_MS);
    return () => window.clearTimeout(t);
  }, []);

  return ready ? <App /> : <CdrrmoStartupLoader />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
