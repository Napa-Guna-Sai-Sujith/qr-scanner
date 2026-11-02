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
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const QRLoginPage = () => {
  const [challenge, setChallenge] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, pending, approved, rejected, expired, consumed
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Cross-device scan detection & approval states
  const [scannerInfo, setScannerInfo] = useState(null);
  const [approvingMobile, setApprovingMobile] = useState(false);
  const [mobileApproved, setMobileApproved] = useState(false);

  const { user, setAuthenticatedUser, checkAuth } = useAuth();
  const navigate = useNavigate();
  const pollTimerRef = useRef(null);
  const completingRef = useRef(false);

  // Complete approved challenge
  const handleComplete = useCallback(async (reqId, signedToken) => {
    if (completingRef.current) return;
    completingRef.current = true;

    try {
      setCompleting(true);
      setError('');
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
        await checkAuth();
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('consumed')) {
        setStatus('consumed');
        await checkAuth();
        navigate('/dashboard');
        return;
      }
      setError(err.message || 'Failed to complete session validation');
      setStatus('rejected');
    } finally {
      setCompleting(false);
      completingRef.current = false;
    }
  }, [navigate, setAuthenticatedUser, checkAuth]);

  // Check current challenge status
  const checkCurrentStatus = useCallback(async (showFeedback = true) => {
    if (!challenge?.requestId) return;

    try {
      if (showFeedback) setCheckingStatus(true);
      setError('');
      const res = await qrApi.getStatus(challenge.requestId);

      if (res.success) {
        if (res.scannerIp) {
          setScannerInfo({
            ip: res.scannerIp,
            scannedAt: res.scannerScannedAt,
            userAgent: res.scannerUserAgent,
          });
        }

        if (res.status === 'approved') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('approved');
          if (!user) {
            await handleComplete(challenge.requestId, challenge.qrToken);
          }
        } else if (res.status === 'consumed') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('consumed');
          if (!user) {
            await checkAuth();
            navigate('/dashboard');
          }
        } else if (res.status === 'rejected') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('rejected');
          setError('Authentication challenge was declined on the mobile device.');
        } else if (res.status === 'expired') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('expired');
        }
      }
    } catch (err) {
      if (showFeedback) {
        setError(err.message || 'Failed to query authorization status');
      }
    } finally {
      if (showFeedback) setCheckingStatus(false);
    }
  }, [challenge, handleComplete, checkAuth, navigate, user]);

  // Device A approves Device B (scanned mobile phone)
  const handleApproveMobile = async () => {
    if (!challenge?.requestId) return;

    try {
      setApprovingMobile(true);
      setError('');
      const res = await qrApi.approveMobile(challenge.requestId);
      if (res.success) {
        setMobileApproved(true);
        setStatus('approved');
      } else {
        throw new Error(res.error || 'Failed to approve mobile device');
      }
    } catch (err) {
      setError(err.message || 'Could not approve mobile device login');
    } finally {
      setApprovingMobile(false);
    }
  };

  // Generate a brand new QR challenge
  const initiateChallenge = useCallback(async () => {
    try {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      completingRef.current = false;
      setScannerInfo(null);
      setMobileApproved(false);
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

  // Initialize on mount
  useEffect(() => {
    initiateChallenge();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [initiateChallenge]);

  // Status Polling Loop (every 1000ms)
  useEffect(() => {
    if (!challenge?.requestId || status !== 'pending') return;

    pollTimerRef.current = setInterval(() => {
      checkCurrentStatus(false);
    }, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [challenge, status, checkCurrentStatus]);

  // Auto-check on window focus or tab visibility change
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && challenge?.requestId && status === 'pending') {
        checkCurrentStatus(false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [challenge, status, checkCurrentStatus]);

  const handleCopyLink = () => {
    if (!challenge?.scanUrl) return;
    navigator.clipboard.writeText(challenge.scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto my-6 sm:my-10 px-4 space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-8 shadow-2xl text-center space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20 text-cyber-cyan text-xs font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>Out-Of-Band Authentication</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-white">
            {user ? 'Authorize Mobile Device (Device B)' : 'Cryptographic QR Login'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {user
              ? `Logged in as ${user.fullName} (${user.email}). Scan with your mobile device (Device B) to log in instantly on the phone.`
              : 'Scan with your authorized mobile device to verify identity and establish an encrypted session.'}
          </p>
        </div>

        {/* Status Badge & Countdown Timer */}
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
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Inbound Scan Alert (Shown when Device B scans the QR code) */}
        {scannerInfo && user && !mobileApproved && (
          <div className="p-4 rounded-xl bg-cyber-900 border-2 border-cyber-cyan text-left space-y-3 shadow-glow animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyber-cyan animate-bounce" />
                <span className="font-bold text-white text-sm">Incoming Login Request from Device B!</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] bg-cyber-cyan/20 text-cyber-cyan font-mono">
                Scanned Just Now
              </span>
            </div>

            <div className="text-xs font-mono space-y-1.5 text-slate-300 bg-cyber-950 p-3 rounded-lg border border-cyber-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Device B IP:</span>
                <span className="text-white font-bold">{scannerInfo.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scanned At:</span>
                <span className="text-slate-300">
                  {new Date(scannerInfo.scannedAt || Date.now()).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleApproveMobile}
                disabled={approvingMobile}
                className="w-full py-2.5 bg-cyber-cyan text-cyber-900 font-bold rounded-lg text-xs sm:text-sm hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {approvingMobile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing Device B...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve Mobile Device Login</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Device Approved Card */}
        {mobileApproved && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2 text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-8 h-8 mx-auto text-cyber-emerald animate-bounce" />
            <p className="text-sm font-bold text-white">Mobile Device (Device B) Logged In!</p>
            <p className="text-xs text-slate-300">
              Device B has been authorized and issued an active cryptographic session.
            </p>
          </div>
        )}

        {/* QR Code Container */}
        <div className="relative inline-block p-3 sm:p-6 bg-white rounded-2xl shadow-glow mx-auto border-4 border-cyber-800 max-w-[calc(100vw-3rem)]">
          {loading ? (
            <div className="w-56 h-56 sm:w-72 sm:h-72 max-w-full flex flex-col items-center justify-center space-y-3 text-slate-800">
              <Loader2 className="w-10 h-10 animate-spin text-cyber-cyan" />
              <span className="text-xs font-mono font-medium">Generating Nonce & HMAC...</span>
            </div>
          ) : challenge?.qrCodeDataUrl ? (
            <div className="relative">
              <img
                src={challenge.qrCodeDataUrl}
                alt="Authentication QR Challenge"
                className={`w-56 h-56 sm:w-72 sm:h-72 max-w-full object-contain transition-all duration-300 ${
                  status === 'expired' || status === 'rejected' ? 'blur-sm opacity-30' : ''
                }`}
              />

              {/* Overlay for Terminal States (Expired / Rejected) */}
              {(status === 'expired' || status === 'rejected') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/85 rounded-xl text-white space-y-3 animate-fade-in">
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

              {/* Overlay for Approved State on unauthenticated terminal */}
              {!user && (status === 'approved' || completing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950/90 rounded-xl text-white space-y-3 animate-fade-in">
                  <CheckCircle2 className="w-12 h-12 text-cyber-emerald animate-bounce" />
                  <p className="text-sm font-bold text-emerald-400">Approved by Mobile Device!</p>
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyber-cyan" />
                    <span>Establishing cryptographic session...</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center">
              <button
                onClick={initiateChallenge}
                className="px-4 py-2 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-sm"
              >
                Generate QR Code
              </button>
            </div>
          )}
        </div>

        {/* Live Status Action Buttons */}
        {challenge && status === 'pending' && (
          <div className="bg-cyber-900/90 border border-cyber-700/60 rounded-xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-cyber-cyan shrink-0" />
                <span>Multi-Device Testing Aids:</span>
              </span>
              <button
                type="button"
                onClick={initiateChallenge}
                className="text-slate-400 hover:text-rose-300 flex items-center gap-1 text-[11px] transition-colors"
                title="Discard and generate new challenge"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New QR Code</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Scan this QR code with your mobile phone camera to connect.
            </p>

            {/* Check Status Button */}
            {!user && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => checkCurrentStatus(true)}
                  disabled={checkingStatus || completing}
                  className="w-full py-2.5 px-4 bg-cyber-cyan text-cyber-900 rounded-xl font-bold text-xs sm:text-sm hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking Approval Status...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Check Approval & Log In Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Direct Testing Links */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-cyber-800">
              <a
                href={challenge.scanUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan text-xs font-semibold rounded-lg border border-cyber-cyan/30 transition-all text-center"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>Open Approval Page</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-cyber-800 hover:bg-cyber-700 text-slate-300 text-xs font-medium rounded-lg border border-cyber-700 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Security Disclaimers */}
        <div className="pt-2 border-t border-cyber-700/60 text-xs text-slate-500 font-mono">
          Security Protocol: HMAC-SHA256 • 120s TTL • Inbound Handshake • Cryptographic Trust
        </div>
      </div>
    </div>
  );
};
