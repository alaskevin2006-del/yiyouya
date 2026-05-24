import { useEffect, useState } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onFinish: () => void;
}

export function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 2100);
    const finishTimer = window.setTimeout(onFinish, 3000);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`loading-screen${isExiting ? ' is-exiting' : ''}`} role="status" aria-live="polite">
      <div className="loading-bg" />
      <div className="loading-brand">
        <span className="loading-logo" aria-hidden="true">
          <img src="/assets/logo-light.png" alt="" />
        </span>
        <span className="loading-brand-copy">
          <strong>逸游鸭</strong>
          <small>替我去看世界</small>
        </span>
      </div>
      <div className="loading-copy" aria-hidden="true">
          <h1 className="loading-title">替我去看世界</h1>
      </div>
    </div>
  );
}
