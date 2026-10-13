import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, setAuthenticatedUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await userApi.getProfile();
        if (res.success) {
          setProfile(res.profile);
          setFullName(res.profile.full_name);
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      setUpdating(true);
      const res = await userApi.updateProfile({ fullName });
      if (res.success) {
        setMessage('Profile updated successfully.');
        setAuthenticatedUser({ ...user, fullName: res.user.full_name });
      }
    } catch (err) {
      setError(err.message || 'Profile update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-10 px-4 space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-4 border-b border-cyber-700/60 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.fullName}</h1>
            <p className="text-sm text-slate-400 font-mono">{user?.email}</p>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Enrolled Email Address (Immutable)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-900/50 border border-cyber-700/50 rounded-xl text-slate-400 font-mono text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-cyber-900/80 p-3.5 rounded-xl border border-cyber-700/60 font-mono text-xs space-y-1">
              <span className="text-slate-500 uppercase tracking-wider block">Account Status:</span>
              <span className="text-cyber-emerald font-bold uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Active & Verified
              </span>
            </div>

            <div className="bg-cyber-900/80 p-3.5 rounded-xl border border-cyber-700/60 font-mono text-xs space-y-1">
              <span className="text-slate-500 uppercase tracking-wider block">Created On:</span>
              <span className="text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyber-cyan" />
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={updating}
              className="py-2.5 px-5 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center gap-2 disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
