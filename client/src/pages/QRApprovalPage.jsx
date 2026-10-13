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
  XCircle,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const QRApprovalPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [resultStatus, setResultStatus] = useState(null); // 'approved' | 'rejected' | null
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
    <div className="max-w-lg mx-auto my-10 px-4 space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Login Approval Request</h1>
          <p className="text-sm text-slate-400">
            A terminal or browser is requesting permission to authenticate with your credentials.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Successful Action States */}
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

        {resultStatus === 'rejected' && (
          <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-3">
            <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Request Rejected</h2>
            <p className="text-sm text-slate-300">
              This authentication challenge was declined. The requesting terminal has been locked out.
            </p>
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
                <span className="text-white">{details.requestingIp || '127.0.0.1'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyber-cyan" /> Created At:
                </span>
                <span className="text-slate-300">
                  {new Date(details.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyber-cyan" /> Cryptographic Integrity:
                </span>
                <span className="text-cyber-emerald font-semibold">HMAC Validated ✓</span>
              </div>

              {details.targetEmail && (
                <div className="flex items-center justify-between pt-1 border-t border-cyber-800">
                  <span className="text-slate-400">Bound Email:</span>
                  <span className="text-cyber-cyan">{details.targetEmail}</span>
                </div>
              )}
            </div>

            {/* Authenticated Approver Identity Check */}
            {user ? (
              <div className="p-3.5 rounded-xl bg-cyber-800/80 border border-cyber-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Approving Account:</span>
                  <span className="text-white font-semibold">{user.fullName} ({user.email})</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Device Label for Enrolled Trust:</label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-cyber-900 border border-cyber-700 rounded text-white text-xs font-sans focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Authentication Required on this Device</span>
                </div>
                <p>
                  You must be logged in on this scanning device to prove your identity before approving login on another screen.
                </p>
                <div className="pt-2 flex gap-2">
                  <Link
                    to="/login"
                    state={{ from: { pathname: `/qr-approve`, search: `?token=${encodeURIComponent(token)}` } }}
                    className="px-3 py-1.5 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 transition-colors"
                  >
                    Log In to Approve
                  </Link>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {details.valid && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="py-3 px-4 rounded-xl font-bold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading || !user}
                  className="py-3 px-4 rounded-xl font-bold bg-cyber-cyan text-cyber-900 hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Approve Login</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
