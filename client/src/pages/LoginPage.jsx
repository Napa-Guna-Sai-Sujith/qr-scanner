import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  QrCode,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 space-y-6">
      {/* QR Login Banner */}
      <div className="bg-gradient-to-r from-cyber-cyan/15 via-blue-500/10 to-transparent border border-cyber-cyan/30 rounded-2xl p-4 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-cyber-cyan font-bold flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Password-Free Alternative
          </span>
          <p className="text-sm text-slate-200">Authenticate securely using camera & cryptographic token</p>
        </div>
        <Link
          to="/qr-login"
          className="px-3.5 py-2 rounded-xl bg-cyber-cyan text-cyber-900 font-bold text-xs hover:bg-cyber-cyanGlow transition-all shrink-0 ml-3"
        >
          Use QR
        </Link>
      </div>

      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">System Sign In</h1>
          <p className="text-sm text-slate-400">Authenticate session via stored password hash</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@security.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold bg-cyber-cyan text-cyber-900 hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Hash...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Fill Buttons */}
        <div className="p-3 bg-cyber-900/80 rounded-xl border border-cyber-700/60 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Pre-Seeded Test Credentials:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('alice@security.edu')}
              className="flex-1 py-1.5 px-2 bg-cyber-800 hover:bg-cyber-700 text-xs text-cyber-cyan font-mono rounded-lg border border-cyber-cyan/20 transition-all text-center"
            >
              Alice (Seeded)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('bob@security.edu')}
              className="flex-1 py-1.5 px-2 bg-cyber-800 hover:bg-cyber-700 text-xs text-cyber-cyan font-mono rounded-lg border border-cyber-cyan/20 transition-all text-center"
            >
              Bob (Seeded)
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-cyber-700/60">
          New to the system?{' '}
          <Link to="/register" className="text-cyber-cyan hover:underline font-medium">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};
