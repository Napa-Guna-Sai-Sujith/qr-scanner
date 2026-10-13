import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  QrCode,
  KeyRound,
  Lock,
  Smartphone,
  Cpu,
  ArrowRight,
  Database,
  CheckCircle,
  XCircle,
  Activity,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-12 pb-6 sm:pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-cyan/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-800 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-cyber-cyan animate-pulse shrink-0" />
            <span className="truncate">Academic Final Year CNS Engineering Project</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Secure <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-blue-500">QR-Based Authentication</span> Using Cryptography
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed px-2">
            Eliminate password transmission over untrusted channels. This system implements an out-of-band cryptographic protocol leveraging <strong className="text-cyber-cyan">HMAC-SHA-256</strong> signed challenges, zero-knowledge nonces, and atomic serverless PostgreSQL transactions.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-3 sm:pt-4 max-w-md sm:max-w-none mx-auto">
            <Link
              to="/qr-login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyber-cyan text-cyber-900 font-bold hover:bg-cyber-cyanGlow transition-all shadow-glow text-sm sm:text-base"
            >
              <QrCode className="w-5 h-5 shrink-0" />
              <span>Launch QR Login Demo</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>

            <Link
              to="/qr-scan"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-cyber-850 text-cyber-cyan font-semibold border border-cyber-cyan/30 hover:bg-cyber-800 transition-all text-sm sm:text-base"
            >
              <Smartphone className="w-5 h-5 shrink-0" />
              <span>Open Authenticator Scanner</span>
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-cyber-800 text-slate-200 font-semibold border border-cyber-700 hover:bg-cyber-700 hover:text-white transition-all text-sm sm:text-base"
            >
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Security Architecture Flow */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyber-700/60 pb-4 gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyber-cyan shrink-0" />
                <span>Zero-Trust Cryptographic Authentication Protocol</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Step-by-step cryptographic sequence preventing MITM, Phishing & Replay attacks
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-cyber-cyan/10 text-cyber-cyan text-xs font-mono border border-cyber-cyan/20">
              RFC 2104 compliant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-cyber-900/80 border border-cyber-700/60 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 text-cyber-cyan flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h3 className="font-semibold text-white text-sm">Challenge Initiation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browser requests login. Server generates 256-bit cryptographically secure random nonce, signs with HMAC-SHA-256, and stores SHA-256 hash with 90s TTL.
              </p>
            </div>

            <div className="bg-cyber-900/80 border border-cyber-700/60 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 text-cyber-cyan flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h3 className="font-semibold text-white text-sm">Out-of-Band Scanning</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                User scans high-density QR code using enrolled second device. Scanned payload verifies cryptographic HMAC signature using constant-time comparison.
              </p>
            </div>

            <div className="bg-cyber-900/80 border border-cyber-700/60 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/10 text-cyber-cyan flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h3 className="font-semibold text-white text-sm">Explicit User Approval</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Scanning device verifies challenger IP and timestamp, then commits atomic status change (`pending` → `approved`) linked to the user's enrolled credentials.
              </p>
            </div>

            <div className="bg-cyber-900/80 border border-cyber-700/60 rounded-xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyber-emerald/10 text-cyber-emerald flex items-center justify-center font-mono font-bold text-sm">
                04
              </div>
              <h3 className="font-semibold text-emerald-400 text-sm">Atomic 2PC Finalization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browser submits original token. Neon PostgreSQL executes row lock `FOR UPDATE`, marks token `consumed`, and mints secure HttpOnly cookie session.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Traditional vs Proposed */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Vulnerability Mitigation Matrix</h2>
          <p className="text-xs sm:text-sm text-slate-400">Why cryptographic QR authentication outperforms traditional static credentials</p>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="sm:hidden flex items-center justify-center gap-1.5 text-xs text-cyber-cyan mb-2 font-mono">
          <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse" />
          <span>Scroll table horizontally to compare →</span>
        </div>

        <div className="overflow-x-auto bg-cyber-850 border border-cyber-700/80 rounded-2xl shadow-xl">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[580px]">
            <thead className="bg-cyber-900/90 text-xs uppercase font-mono text-slate-400 border-b border-cyber-700/80">
              <tr>
                <th className="py-3 sm:py-4 px-4 sm:px-6">Attack Vector / Threat Model</th>
                <th className="py-3 sm:py-4 px-4 sm:px-6 text-rose-400">Traditional Password Login</th>
                <th className="py-3 sm:py-4 px-4 sm:px-6 text-cyber-cyan">Proposed Cryptographic QR System</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-700/50">
              <tr className="hover:bg-cyber-800/40">
                <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Credential Stuffing & Dictionary Attacks</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  High Risk: Reused credentials easily exploited
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cyber-emerald shrink-0" />
                    Immune: Passwords are never typed or sent during QR flow
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-cyber-800/40">
                <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Keylogger & Shoulder Surfing</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  Vulnerable: Keystrokes intercepted on host device
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cyber-emerald shrink-0" />
                    Zero Keystrokes: Authenticated via isolated mobile channel
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-cyber-800/40">
                <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Replay Attacks & Session Hijacking</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  Tokens or passwords sniffed can be reused
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cyber-emerald shrink-0" />
                    Single-Use Nonces: 90s TTL & atomic database status transition
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-cyber-800/40">
                <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Man-In-The-Middle (MITM) & Phishing</td>
                <td className="py-3.5 px-4 sm:px-6 text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  Victim inputs credentials on counterfeit site
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cyber-emerald shrink-0" />
                    HMAC Verified: Untrusted clones cannot forge server signature
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Database & Cryptographic Primitives Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyber-cyan/10 text-cyber-cyan flex items-center justify-center">
            <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">HMAC-SHA-256 Signatures</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Each authentication token payload is signed using a high-entropy secret. Constant-time comparison (<code className="text-cyber-cyan">crypto.timingSafeEqual</code>) eliminates timing side-channel attacks.
          </p>
        </div>

        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyber-emerald/10 text-cyber-emerald flex items-center justify-center">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Neon Serverless PostgreSQL</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Relational database with strict foreign keys, unique constraint indexes, and transactional concurrency locking (<code className="text-cyber-emerald">SELECT ... FOR UPDATE</code>) guaranteeing single-use token consumption.
          </p>
        </div>

        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-6 space-y-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Zero-Knowledge Storage</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Raw tokens and plaintext session IDs are never written to disk. The server stores only cryptographic SHA-256 hashes, ensuring database dumps cannot be abused to impersonate users.
          </p>
        </div>
      </section>
    </div>
  );
};
