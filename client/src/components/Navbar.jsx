import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  QrCode,
  Scan,
  LayoutDashboard,
  History,
  User,
  Settings,
  LogOut,
  Lock,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-cyber-850 border-b border-cyber-700/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-cyber-900 border border-cyber-cyan/50 flex items-center justify-center text-cyber-cyan group-hover:shadow-glow transition-all duration-300">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-wide">
                Crypto<span className="text-cyber-cyan">QR</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 font-mono">
                HMAC-SHA256
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to="/qr-scan"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/qr-scan')
                  ? 'bg-cyber-cyan text-cyber-900 font-semibold'
                  : 'text-slate-300 hover:text-cyber-cyan hover:bg-cyber-800'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Scan QR</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-cyber-700 text-cyber-cyan'
                      : 'text-slate-300 hover:text-white hover:bg-cyber-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </Link>

                <Link
                  to="/history"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/history')
                      ? 'bg-cyber-700 text-cyber-cyan'
                      : 'text-slate-300 hover:text-white hover:bg-cyber-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span className="hidden md:inline">Audit Logs</span>
                </Link>

                <Link
                  to="/profile"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/profile')
                      ? 'bg-cyber-700 text-cyber-cyan'
                      : 'text-slate-300 hover:text-white hover:bg-cyber-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">{user.fullName.split(' ')[0]}</span>
                </Link>

                <Link
                  to="/settings"
                  className={`p-2 rounded-lg text-slate-300 hover:text-white hover:bg-cyber-800 transition-colors ${
                    isActive('/settings') ? 'text-cyber-cyan bg-cyber-800' : ''
                  }`}
                  title="Security Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium text-cyber-rose hover:bg-cyber-rose/10 border border-cyber-rose/20 transition-colors"
                  title="Revoke session & Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/qr-login"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cyber-cyan hover:bg-cyber-cyan/10 border border-cyber-cyan/30 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Login</span>
                </Link>

                <Link
                  to="/login"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-cyber-800 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>Password</span>
                </Link>

                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-cyber-cyan text-cyber-900 hover:bg-cyber-cyanGlow transition-all shadow-glow"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
