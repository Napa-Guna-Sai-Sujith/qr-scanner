import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { qrApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/CountdownTimer';
import { StatusBadge } from '../components/StatusBadge';
import {
  QrCode,
  RefreshCw,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const QRLoginPage = () => {
  const [challenge, setChallenge] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, pending, approved, rejected, expired, consumed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { setAuthenticatedUser } = useAuth();
  const navigate = useNavigate();
  const pollTimerRef = useRef(null);

  // Generate new QR challenge
  const initiateChallenge = useCallback(async () => {
    try {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setLoading(true);
      setError('');
      setStatus('pending');

      const data = await qrApi.initiate();
      if (data.success) {
        setChallenge(data);
      } else {
        throw new Error(data.error || 'Failed to generate challenge');
      }
    } catch (err) {
      setError(err.message || 'Unable to communicate with authentication authority');
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initiateChallenge();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [initiateChallenge]);

  // Complete approved challenge
  const handleComplete = useCallback(async (reqId, signedToken) => {
    try {
      setCompleting(true);
      const res = await qrApi.complete({
        requestId: reqId,
        token: signedToken,
      });

      if (res.success && res.user) {
        if (res.token) {
          localStorage.setItem('cns_session_token', res.token);
        }
        setStatus('consumed');
        setAuthenticatedUser(res.user);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete session validation');
      setStatus('rejected');
    } finally {
      setCompleting(false);
    }
  }, [navigate, setAuthenticatedUser]);

  // Status Polling Loop
  useEffect(() => {
    if (!challenge?.requestId || status !== 'pending') return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await qrApi.getStatus(challenge.requestId);
        if (res.success) {
          if (res.status === 'approved') {
            clearInterval(pollTimerRef.current);
            setStatus('approved');
            // Auto complete authentication
            handleComplete(challenge.requestId, challenge.qrToken);
          } else if (res.status === 'rejected' || res.status === 'expired') {
            clearInterval(pollTimerRef.current);
            setStatus(res.status);
          }
        }
      } catch {
        // Silently tolerate transient polling drops
      }
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [challenge, status, handleComplete]);

  const handleCopyLink = () => {
    if (!challenge?.scanUrl) return;
    navigator.clipboard.writeText(challenge.scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto my-10 px-4 space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>Out-Of-Band Authentication</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Cryptographic QR Login</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Scan with your authorized mobile device or second browser tab to verify and establish an encrypted session.
          </p>
        </div>

        {/* Status Badge & Timer */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <StatusBadge status={status} />
          {challenge && status === 'pending' && (
            <CountdownTimer
              expiresAt={challenge.expiresAt}
              onExpire={() => setStatus('expired')}
            />
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* QR Code Container */}
        <div className="relative inline-block p-4 sm:p-6 bg-white rounded-2xl shadow-glow mx-auto border-4 border-cyber-800">
          {loading ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center space-y-3 text-slate-800">
              <Loader2 className="w-10 h-10 animate-spin text-cyber-cyan" />
              <span className="text-xs font-mono font-medium">Generating Nonce & HMAC...</span>
            </div>
          ) : challenge?.qrCodeDataUrl ? (
            <div className="relative">
              <img
                src={challenge.qrCodeDataUrl}
                alt="Authentication QR Challenge"
                className={`w-64 h-64 sm:w-72 sm:h-72 object-contain transition-all duration-300 ${
                  status === 'expired' || status === 'rejected' ? 'blur-sm opacity-30' : ''
                }`}
              />

              {/* Overlay for terminal states */}
              {(status === 'expired' || status === 'rejected') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-xl text-white space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400" />
                  <p className="text-sm font-semibold">
                    {status === 'expired' ? 'QR Code Challenge Expired' : 'Authentication Request Rejected'}
                  </p>
                  <button
                    onClick={initiateChallenge}
                    className="px-4 py-2 bg-cyber-cyan text-cyber-900 rounded-xl font-bold text-xs hover:bg-cyber-cyanGlow flex items-center gap-1.5 transition-all shadow-glow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Fresh Code</span>
                  </button>
                </div>
              )}

              {/* Overlay for approved/completing state */}
              {(status === 'approved' || completing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/90 rounded-xl text-white space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-cyber-emerald animate-bounce" />
                  <p className="text-sm font-bold text-emerald-400">Approved by Device!</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Minting session cookie...</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center">
              <button
                onClick={initiateChallenge}
                className="px-4 py-2 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-sm"
              >
                Generate QR Code
              </button>
            </div>
          )}
        </div>

        {/* Action Controls for Academic Demo & Testing */}
        {challenge && status === 'pending' && (
          <div className="bg-cyber-900/90 border border-cyber-700/60 rounded-xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-cyber-cyan" />
                Examiner / Multi-Device Testing Aids:
              </span>
              <button
                onClick={initiateChallenge}
                className="text-cyber-cyan hover:underline flex items-center gap-1 text-xs"
                title="Regenerate Challenge"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              You can scan this QR code with a mobile camera, open the built-in{' '}
              <Link to="/qr-scan" className="text-cyber-cyan underline">QR Scanner</Link>, or click below to simulate phone approval in another tab:
            </p>

            <div className="flex flex-wrap gap-2">
              <a
                href={challenge.scanUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-3 py-2 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan text-xs font-semibold rounded-lg border border-cyber-cyan/30 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Approval Page in New Tab</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-cyber-800 hover:bg-cyber-700 text-slate-300 text-xs font-medium rounded-lg border border-cyber-700 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Security Disclaimers */}
        <div className="pt-2 border-t border-cyber-700/60 text-xs text-slate-500 font-mono">
          Security Protocol: HMAC-SHA256 • 90s Expiration • Atomic Conditional UPDATE • Replay-Proof
        </div>
      </div>
    </div>
  );
};
