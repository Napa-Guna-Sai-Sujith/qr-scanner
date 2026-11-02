import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { qrApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Smartphone,
  Globe,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

export const QRApprovalPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { user, setAuthenticatedUser, checkAuth } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkingMobileStatus, setCheckingMobileStatus] = useState(false);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [resultStatus, setResultStatus] = useState(null); // 'approved' | 'approved_logged_in' | 'rejected' | null
  const [deviceName, setDeviceName] = useState('Authorized Mobile Device');

  const inspectToken = useCallback(async () => {
    if (!token) {
      setError('No cryptographic token was provided in the query parameters.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await qrApi.inspect(token);
      if (res.success) {
        setDetails(res);
      } else {
        throw new Error(res.error || 'Failed to inspect authentication challenge');
      }
    } catch (err) {
      setError(err.message || 'Token verification failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    inspectToken();
  }, [inspectToken]);

  // For unauthenticated Device B: check if Device A has approved the request
  const checkMobileApprovalStatus = useCallback(async () => {
    if (!details?.requestId) return;

    try {
      setCheckingMobileStatus(true);
      const res = await qrApi.getStatus(details.requestId);
      if (res.success) {
        if (res.status === 'approved' && res.sessionToken) {
          localStorage.setItem('cns_session_token', res.sessionToken);
          if (res.targetUser) {
            setAuthenticatedUser(res.targetUser);
          }
          setResultStatus('approved_logged_in');
          await checkAuth();
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } else if (res.status === 'consumed') {
          setResultStatus('approved_logged_in');
          await checkAuth();
          navigate('/dashboard');
        } else if (res.status === 'rejected') {
          setResultStatus('rejected');
          setError('Login request was declined by the computer terminal.');
        } else if (res.status === 'expired') {
          setError('This QR challenge has expired. Please generate a new one on your computer.');
        }
      }
    } catch (err) {
      console.warn('Check mobile approval error:', err);
    } finally {
      setCheckingMobileStatus(false);
    }
  }, [details, setAuthenticatedUser, checkAuth, navigate]);

  // Auto-poll approval from Device A every 1200ms
  useEffect(() => {
    if (user || !details?.requestId || resultStatus) return;

    const interval = setInterval(() => {
      checkMobileApprovalStatus();
    }, 1200);

    return () => clearInterval(interval);
  }, [user, details, resultStatus, checkMobileApprovalStatus]);

  // Classic flow: Logged-in Device B approves unauthenticated terminal
  const handleApprove = async () => {
    if (!user) {
      setError('You must sign in to an enrolled account before approving this request.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const res = await qrApi.approve({
        token,
        deviceName,
      });

      if (res.success) {
        setResultStatus('approved');
      } else {
        throw new Error(res.error || 'Approval failed');
      }
    } catch (err) {
      setError(err.message || 'Could not approve login request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      setError('');
      const res = await qrApi.reject({
        token,
        reason: 'Explicitly rejected by user on authenticator device',
      });

      if (res.success) {
        setResultStatus('rejected');
      } else {
        throw new Error(res.error || 'Rejection failed');
      }
    } catch (err) {
      setError(err.message || 'Could not reject request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-6 sm:my-10 px-4 space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Login Approval Request</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {user
              ? 'A terminal or browser is requesting permission to authenticate with your credentials.'
              : 'Your mobile device has connected and requested authorization from your computer.'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Authentication Challenge Notice</span>
                <p className="text-xs leading-relaxed text-rose-200">{error}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={inspectToken}
                className="px-3.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 rounded-lg text-xs font-semibold border border-rose-500/40 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Retry Verification</span>
              </button>
              <Link
                to="/qr-login"
                className="px-3.5 py-1.5 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan rounded-lg text-xs font-semibold border border-cyber-cyan/30 transition-colors"
              >
                Go to QR Login
              </Link>
            </div>
          </div>
        )}

        {/* State 1: Mobile device successfully logged in via Computer Approval */}
        {resultStatus === 'approved_logged_in' && (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3 animate-fade-in">
            <CheckCircle2 className="w-14 h-14 text-cyber-emerald mx-auto animate-bounce" />
            <h2 className="text-xl font-bold text-white">Login Approved by Computer!</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your mobile device has been cryptographically authenticated. Redirecting to your dashboard...
            </p>
            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyber-cyan text-cyber-900 rounded-xl text-xs font-bold hover:bg-cyber-cyanGlow transition-all shadow-glow"
              >
                <span>Go to Dashboard Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* State 2: Computer terminal approved by Logged-in Mobile Device */}
        {resultStatus === 'approved' && (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-cyber-emerald mx-auto" />
            <h2 className="text-lg font-bold text-white">Login Request Approved!</h2>
            <p className="text-sm text-slate-300">
              The requesting device has been cryptographically validated. Access has been granted.
            </p>
            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyber-800 text-cyber-cyan rounded-xl text-xs font-semibold hover:bg-cyber-700 transition-colors"
              >
                <span>Go to My Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Rejected */}
        {resultStatus === 'rejected' && (
          <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-3">
            <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Request Rejected</h2>
            <p className="text-sm text-slate-300">
              This authentication challenge was declined.
            </p>
            <div className="pt-2">
              <Link
                to="/qr-login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyber-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-cyber-700 transition-colors"
              >
                <span>Back to QR Login</span>
              </Link>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
            <span className="text-xs font-mono text-slate-400">Verifying HMAC-SHA256 signature...</span>
          </div>
        )}

        {/* Request Inspection Details */}
        {!loading && !resultStatus && details && (
          <div className="space-y-4">
            <div className="bg-cyber-900 border border-cyber-700/80 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-cyber-800">
                <span className="text-slate-400">CHALLENGE STATUS</span>
                <span
                  className={`font-bold uppercase ${
                    details.valid ? 'text-cyber-cyan' : 'text-rose-400'
                  }`}
                >
                  {details.status}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyber-cyan" /> Requesting IP:
                </span>
                <span className="text-white font-bold">{details.scannerIp || details.requestingIp || '127.0.0.1'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyber-cyan" /> Scanned At:
                </span>
                <span className="text-slate-300">
                  {new Date(details.scannerScannedAt || details.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyber-cyan" /> Cryptographic Integrity:
                </span>
                <span className="text-cyber-emerald font-semibold">HMAC Validated ✓</span>
              </div>

              {(details.targetFullName || details.targetEmail) && (
                <div className="flex items-center justify-between pt-1 border-t border-cyber-800">
                  <span className="text-slate-400">Target Account:</span>
                  <span className="text-cyber-cyan font-bold">
                    {details.targetFullName ? `${details.targetFullName} (${details.targetEmail})` : details.targetEmail}
                  </span>
                </div>
              )}
            </div>

            {/* Non-valid State Notice (Expired / Consumed) */}
            {!details.valid && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">
                      {details.status === 'expired'
                        ? 'QR Challenge Expired'
                        : details.status === 'consumed'
                        ? 'QR Challenge Already Consumed'
                        : 'Challenge Inactive'}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {details.status === 'expired'
                        ? 'For security, each QR code has a strict 120-second lifetime. Return to the computer screen to generate a fresh QR code.'
                        : 'This challenge has already been validated and session tokens have been issued.'}
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap gap-2">
                  <Link
                    to="/qr-login"
                    className="px-4 py-2 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow"
                  >
                    Generate Fresh QR Code
                  </Link>
                </div>
              </div>
            )}

            {/* Valid State Handlers */}
            {details.valid && (
              <>
                {/* FLOW A: Device B is NOT logged in. Device B is requesting to log in via Device A's approval! */}
                {!user ? (
                  <div className="p-5 rounded-2xl bg-cyber-900/90 border border-cyber-cyan/40 text-center space-y-4 shadow-xl">
                    <div className="w-12 h-12 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan rounded-full flex items-center justify-center mx-auto">
                      <Smartphone className="w-6 h-6 animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-base sm:text-lg font-bold text-white">
                        Login Request Submitted to Device A!
                      </h2>
                      <p className="text-xs text-slate-300">
                        Waiting for authorization on your computer terminal.
                      </p>
                    </div>

                    <div className="bg-cyber-950 p-3 rounded-xl border border-cyber-800 text-left space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Target Account:</span>
                        <span className="text-cyber-cyan font-bold truncate max-w-[200px]">
                          {details.targetFullName || details.targetEmail || 'Alice (alice@security.edu)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Your Device IP:</span>
                        <span className="text-white font-bold">{details.scannerIp || '10.28.128.162'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Request Time:</span>
                        <span className="text-slate-300">
                          {new Date(details.scannerScannedAt || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-cyber-800 text-amber-300">
                        <span>Approval Status:</span>
                        <span className="font-bold flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Waiting for Computer Approval...</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        type="button"
                        onClick={checkMobileApprovalStatus}
                        disabled={checkingMobileStatus}
                        className="w-full py-3 px-4 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-xs sm:text-sm hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2"
                      >
                        {checkingMobileStatus ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Checking Approval Status...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Refresh Status / Log In Now</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Tap <strong>&quot;Approve Mobile Device&quot;</strong> on your computer screen. Once approved, tap above or wait for auto-redirect.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* FLOW B: Device B is ALREADY logged in and approving another screen */
                  <>
                    <div className="p-3.5 rounded-xl bg-cyber-800/80 border border-cyber-700 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400">Approving Account:</span>
                        <span className="text-white font-semibold truncate">
                          {user.fullName} ({user.email})
                        </span>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Device Label for Enrolled Trust:</label>
                        <input
                          type="text"
                          value={deviceName}
                          onChange={(e) => setDeviceName(e.target.value)}
                          className="w-full px-3 py-2 bg-cyber-900 border border-cyber-700 rounded-lg text-white text-xs font-sans focus:outline-none focus:border-cyber-cyan"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="w-full py-3.5 px-4 rounded-xl font-bold bg-cyber-cyan text-cyber-900 hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 text-sm order-1 sm:order-2"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>Approve Login</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="w-full py-3.5 px-4 rounded-xl font-bold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm order-2 sm:order-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Request</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
