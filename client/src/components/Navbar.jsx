import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-cyber-850 border-b border-cyber-700/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" onClick={closeMenu} className="flex items-center space-x-2.5 sm:space-x-3 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-cyber-900 border border-cyber-cyan/50 flex items-center justify-center text-cyber-cyan group-hover:shadow-glow transition-all duration-300">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg text-white tracking-wide">
                Crypto<span className="text-cyber-cyan">QR</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] sm:text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20 font-mono">
                HMAC-SHA256
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (>= md) */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
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
                  <span>Dashboard</span>
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
                  <span>Audit Logs</span>
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
                  <span>{user.fullName.split(' ')[0]}</span>
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
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium text-cyber-rose hover:bg-cyber-rose/10 border border-cyber-rose/20 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
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

          {/* Mobile Fast Scan Icon + Hamburger Button (< md) */}
          <div className="flex md:hidden items-center space-x-2">
            <Link
              to="/qr-scan"
              onClick={closeMenu}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                isActive('/qr-scan')
                  ? 'bg-cyber-cyan text-cyber-900'
                  : 'bg-cyber-800 text-cyber-cyan border border-cyber-cyan/30'
              }`}
              title="Quick QR Scan"
            >
              <Scan className="w-4 h-4" />
              <span>Scan</span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-cyber-800 border border-cyber-700 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyber-cyan"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyber-cyan" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-cyber-900/95 border-b border-cyber-700/80 px-4 pt-3 pb-6 space-y-2 backdrop-blur-xl animate-in slide-in-from-top duration-200 shadow-2xl">
          {user && (
            <div className="p-3 mb-3 rounded-xl bg-cyber-850 border border-cyber-700/80 flex items-center justify-between">
              <div className="space-y-0.5 truncate mr-2">
                <p className="text-xs text-slate-400">Authenticated Subject</p>
                <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                <p className="text-[11px] text-cyber-cyan font-mono truncate">{user.email}</p>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Active
              </span>
            </div>
          )}

          <div className="space-y-1">
            <Link
              to="/qr-scan"
              onClick={closeMenu}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/qr-scan')
                  ? 'bg-cyber-cyan text-cyber-900 font-bold'
                  : 'text-slate-200 hover:bg-cyber-800'
              }`}
            >
              <Scan className="w-4 h-4 text-cyber-cyan" />
              <span>Scan QR Challenge</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-cyber-cyan text-cyber-900 font-bold'
                      : 'text-slate-200 hover:bg-cyber-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Security Dashboard</span>
                </Link>

                <Link
                  to="/history"
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/history')
                      ? 'bg-cyber-cyan text-cyber-900 font-bold'
                      : 'text-slate-200 hover:bg-cyber-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Audit History Ledger</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/profile')
                      ? 'bg-cyber-cyan text-cyber-900 font-bold'
                      : 'text-slate-200 hover:bg-cyber-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>User Profile</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/settings')
                      ? 'bg-cyber-cyan text-cyber-900 font-bold'
                      : 'text-slate-200 hover:bg-cyber-800'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Security & Device Settings</span>
                </Link>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-cyber-rose/10 text-cyber-rose border border-cyber-rose/30 hover:bg-cyber-rose/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Revoke Session & Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/qr-login"
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/qr-login')
                      ? 'bg-cyber-cyan text-cyber-900 font-bold'
                      : 'text-slate-200 hover:bg-cyber-800'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-cyber-cyan" />
                  <span>QR-Based Login</span>
                </Link>

                <Link
                  to="/login"
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/login')
                      ? 'bg-cyber-cyan text-cyber-900 font-bold'
                      : 'text-slate-200 hover:bg-cyber-800'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Password Sign In</span>
                </Link>

                <div className="pt-2">
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold bg-cyber-cyan text-cyber-900 hover:bg-cyber-cyanGlow transition-all shadow-glow"
                  >
                    <span>Create Security Account</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
