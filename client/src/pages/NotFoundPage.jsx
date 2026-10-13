import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="max-w-md mx-auto my-20 px-4 text-center space-y-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-cyber-850 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan shadow-glow">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-5xl font-extrabold text-white font-mono">404</h1>
        <h2 className="text-xl font-bold text-slate-200">Cryptographic Route Not Found</h2>
        <p className="text-sm text-slate-400">
          The requested endpoint does not exist or has been invalidated by the security gateway.
        </p>
      </div>

      <div className="pt-4 flex justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow"
        >
          <Home className="w-4 h-4" />
          <span>Return to Safety</span>
        </Link>
      </div>
    </div>
  );
};
