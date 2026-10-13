import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import {
  ShieldCheck,
  Smartphone,
  History,
  QrCode,
  KeyRound,
  Lock,
  ExternalLink,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [profileRes, historyRes] = await Promise.all([
        userApi.getProfile(),
        userApi.getHistory(),
      ]);

      if (profileRes.success) setProfileData(profileRes);
      if (historyRes.success) setRecentLogs(historyRes.logs.slice(0, 5));
    } catch (err) {
      setError(err.message || 'Failed to fetch security analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto my-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Welcome Header */}
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-2 max-w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Cryptographic Session Validated</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white">
            Welcome, <span className="text-cyber-cyan">{user?.fullName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono break-all leading-relaxed">
            <span>Subject ID: <code className="text-slate-300">{user?.id}</code></span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline mt-0.5 sm:mt-0">Email: <code className="text-slate-300">{user?.email}</code></span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Link
            to="/qr-login"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-cyan text-cyber-900 font-bold text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow text-center"
          >
            <QrCode className="w-4 h-4" />
            <span>Generate QR</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-cyber-800 text-slate-300 hover:text-white border border-cyber-700 transition-colors shrink-0"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>Enrolled Devices</span>
            <Smartphone className="w-4 h-4 text-cyber-cyan" />
          </div>
          <div className="text-2xl font-bold text-white">
            {profileData?.stats?.activeDevices ?? 1}
          </div>
          <p className="text-xs text-slate-400">Authorized authenticators</p>
        </div>

        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>Active Sessions</span>
            <Lock className="w-4 h-4 text-cyber-emerald" />
          </div>
          <div className="text-2xl font-bold text-white">
            {profileData?.stats?.activeSessions ?? 1}
          </div>
          <p className="text-xs text-slate-400">Hashed server sessions</p>
        </div>

        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>Integrity Guard</span>
            <KeyRound className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">HMAC-SHA256</div>
          <p className="text-xs text-slate-400">Constant-time validation</p>
        </div>

        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span>Database Backend</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">Neon PostgreSQL</div>
          <p className="text-xs text-slate-400">Serverless cloud cluster</p>
        </div>
      </div>

      {/* Two Column Layout: Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyber-cyan" />
            <span>Fast Security Controls</span>
          </h2>

          <div className="space-y-3">
            <Link
              to="/qr-login"
              className="block bg-cyber-850 hover:bg-cyber-800 border border-cyber-700/80 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyber-cyan/10 text-cyber-cyan group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Launch QR Challenge</h3>
                    <p className="text-xs text-slate-400">Generate single-use signed code</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyber-cyan transition-colors" />
              </div>
            </Link>

            <Link
              to="/qr-scan"
              className="block bg-cyber-850 hover:bg-cyber-800 border border-cyber-700/80 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyber-emerald/10 text-cyber-emerald group-hover:scale-105 transition-transform">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Scan Challenge</h3>
                    <p className="text-xs text-slate-400">Approve login from this camera</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyber-emerald transition-colors" />
              </div>
            </Link>

            <Link
              to="/history"
              className="block bg-cyber-850 hover:bg-cyber-800 border border-cyber-700/80 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Audit Trail</h3>
                    <p className="text-xs text-slate-400">Inspect 50 latest security events</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Audit Log Preview */}
        <div className="lg:col-span-2 bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-700/60">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyber-cyan" />
                <span>Recent Security & Login Events</span>
              </h2>
              <p className="text-xs text-slate-400">Cryptographically immutable audit records</p>
            </div>
            <Link
              to="/history"
              className="text-xs text-cyber-cyan hover:underline flex items-center gap-1 font-mono"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyber-cyan" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No recent audit logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono min-w-[480px]">
                <thead className="text-slate-400 uppercase border-b border-cyber-700/50">
                  <tr>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyber-700/30 text-slate-300">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-cyber-800/40">
                      <td className="py-2.5 px-3 text-white font-semibold">{log.event_type}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            log.result === 'SUCCESS'
                              ? 'bg-cyber-emerald/15 text-cyber-emerald'
                              : log.result === 'WARNING'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{log.ip_address}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
