import React from 'react';
import { Shield, KeyRound, Cpu, Terminal } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-cyber-850 border-t border-cyber-700/80 py-8 px-4 sm:px-6 lg:px-8 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-cyber-cyan" />
          <span>
            <strong className="text-slate-200">Secure QR-Based Authentication System</strong> — Computer & Network Security Project
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-cyber-cyan" /> HMAC-SHA256
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyber-emerald" /> Neon PostgreSQL
          </span>
          <span className="flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-amber-400" /> Atomic 2PC
          </span>
          <span className="px-2 py-0.5 rounded bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20">
            TLS 1.3 Active
          </span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-cyber-700/40 text-center text-xs text-slate-500">
        Engineered with zero-knowledge token hashing, timing-safe verification, single-use nonce validation, and HTTP-only session cookies.
      </div>
    </footer>
  );
};
