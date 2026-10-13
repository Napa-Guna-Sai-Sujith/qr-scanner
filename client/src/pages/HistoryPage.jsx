import React, { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Calendar,
  Globe,
} from 'lucide-react';

export const HistoryPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await userApi.getHistory();
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Failed to load audit history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filterType === 'ALL' || log.event_type.includes(filterType);
    const matchesSearch =
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ip_address && log.ip_address.includes(searchQuery)) ||
      (log.result && log.result.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto my-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Knowledge Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Cryptographic Audit History</h1>
          <p className="text-sm text-slate-400">
            Immutable log of all authentication requests, approvals, challenge generations, and revocations.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyber-800 hover:bg-cyber-700 text-slate-300 hover:text-white rounded-xl border border-cyber-700 text-xs font-semibold transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Controls / Filter Bar */}
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event, IP, result..."
            className="w-full pl-10 pr-4 py-2 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyber-cyan font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
          {['ALL', 'QR', 'PASSWORD', 'SESSION'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                filterType === type
                  ? 'bg-cyber-cyan text-cyber-900 font-bold'
                  : 'bg-cyber-800 text-slate-300 hover:bg-cyber-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl overflow-hidden shadow-xl">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-cyber-900/60 text-[11px] text-cyber-cyan border-b border-cyber-700/40 font-mono">
          <span>Swipe horizontally for full audit details →</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
            <span className="text-xs font-mono text-slate-400">Querying Neon PostgreSQL audit table...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono min-w-[550px]">
              <thead className="bg-cyber-900/90 text-slate-400 uppercase border-b border-cyber-700/80">
                <tr>
                  <th className="py-3.5 px-4">Event Classification</th>
                  <th className="py-3.5 px-4">Result</th>
                  <th className="py-3.5 px-4">Origin IP</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-700/40 text-slate-300">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-cyber-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {log.event_type}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          log.result === 'SUCCESS'
                            ? 'bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30'
                            : log.result === 'WARNING'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.result === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : log.result === 'WARNING' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{log.result}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1.5 pt-4">
                      <Globe className="w-3 h-3 text-cyber-cyan" />
                      <span>{log.ip_address}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-cyber-cyan hover:underline">
                      Inspect
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-cyber-850 border border-cyber-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyber-700/60 pb-3">
              <h3 className="font-bold text-white text-base font-mono">
                Event: {selectedLog.event_type}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-500">Record ID: </span>
                <span className="text-slate-300">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-slate-500">Result: </span>
                <span className="text-white font-bold">{selectedLog.result}</span>
              </div>
              <div>
                <span className="text-slate-500">IP: </span>
                <span className="text-slate-300">{selectedLog.ip_address}</span>
              </div>
              <div>
                <span className="text-slate-500">User Agent: </span>
                <span className="text-slate-400 block break-words mt-1 p-2 bg-cyber-900 rounded">
                  {selectedLog.user_agent}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Metadata Payload: </span>
                <pre className="p-3 bg-cyber-900 rounded text-cyber-cyan text-[11px] overflow-x-auto mt-1">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
