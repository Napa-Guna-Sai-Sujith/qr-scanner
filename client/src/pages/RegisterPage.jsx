import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

export const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const requiresAuthNotice = location.state?.from?.pathname === '/qr-login';

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');
      await googleLogin(credentialResponse.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Google registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was closed or failed.');
  };

  // Password strength checks
  const rules = [
    { label: 'Minimum 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least one numeric digit', met: /[0-9]/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const allRulesMet = rules.every((r) => r.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allRulesMet) {
      setError('Please fulfill all password security complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    try {
      setLoading(true);
      await register(fullName, email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-12 px-4">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Security Account</h1>
          <p className="text-sm text-slate-400">Enroll credentials into the cryptographic directory</p>
        </div>

        {requiresAuthNotice && (
          <div className="p-3.5 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs flex items-start gap-2.5 animate-fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Create an account or sign in with Google to access the QR login generator.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Ada Lovelace"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan text-sm"
              />
            </div>
          </div>

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
                placeholder="name@security.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Master Password
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Confirm Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan text-sm"
              />
            </div>
          </div>

          {/* Password Security Rules */}
          <div className="p-3 bg-cyber-900/80 rounded-xl border border-cyber-700/60 space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Cryptographic Complexity Criteria:
            </span>
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                {rule.met ? (
                  <Check className="w-3.5 h-3.5 text-cyber-emerald shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className={rule.met ? 'text-slate-200' : 'text-slate-500'}>{rule.label}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold bg-cyber-cyan text-cyber-900 hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Hashing & Enrolling...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Google OAuth Section */}
        <div className="space-y-3 pt-1">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-cyber-700 w-full" />
            <span className="bg-cyber-850 px-3 text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
              Or Sign Up With Mail
            </span>
            <div className="border-t border-cyber-700 w-full" />
          </div>

          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="pill"
              text="signup_with"
            />
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-cyber-700/60">
          Already enrolled?{' '}
          <Link to="/login" state={location.state} className="text-cyber-cyan hover:underline font-medium">
            Sign in with Password or Mail
          </Link>
        </div>
      </div>
    </div>
  );
};
