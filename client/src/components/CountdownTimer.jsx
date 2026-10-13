import React, { useEffect, useState } from 'react';
import { Timer, AlertCircle } from 'lucide-react';

export const CountdownTimer = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft <= 20;

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono text-sm transition-colors ${
        isUrgent
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
          : 'bg-cyber-800 border-cyber-700 text-slate-300'
      }`}
    >
      {isUrgent ? <AlertCircle className="w-4 h-4" /> : <Timer className="w-4 h-4 text-cyber-cyan" />}
      <span>
        Expires in:{' '}
        <strong className="text-white">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </strong>
      </span>
    </div>
  );
};
