import React, { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import {
  Lock,
  Smartphone,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

export const SecuritySettingsPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [deviceActionMsg, setDeviceActionMsg] = useState('');

  const fetchDevices = async () => {
    try {
      setDevicesLoading(true);
      const res = await userApi.getDevices();
      if (res.success) {
        setDevices(res.devices);
      }
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await userApi.updateProfile({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPasswordMessage('Master password changed successfully. Other active sessions revoked.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.message || 'Password update failed');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    try {
      const res = await userApi.revokeDevice(deviceId);
      if (res.success) {
        setDeviceActionMsg(res.message);
        fetchDevices();
        setTimeout(() => setDeviceActionMsg(''), 4000);
      }
    } catch (err) {
      alert(err.message || 'Failed to revoke device');
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 sm:my-10 px-4 space-y-6 sm:space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <KeyRound className="w-6 h-6 sm:w-7 sm:h-7 text-cyber-cyan shrink-0" />
          <span>Security & Credential Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Manage master password credentials, authorized authenticating devices, and session security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Change Master Password */}
        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-cyber-700/60 pb-3">
            <Lock className="w-5 h-5 text-cyber-cyan" />
            <h2 className="text-sm sm:text-base font-bold text-white">Rotate Master Password</h2>
          </div>

          {passwordMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordMessage}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-cyber-900 border border-cyber-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                New Master Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Must include A-Z, a-z, 0-9, and special char"
                className="w-full px-3 py-2 bg-cyber-900 border border-cyber-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-cyber-900 border border-cyber-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyber-cyan"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 px-4 bg-cyber-cyan text-cyber-900 font-bold rounded-xl text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {passwordLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Update Password & Revoke Other Sessions</span>
              </button>
            </div>
          </form>
        </div>

        {/* Enrolled Authenticator Devices */}
        <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-cyber-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyber-emerald" />
              <h2 className="text-base font-bold text-white">Enrolled Authenticator Devices</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {devices.filter((d) => !d.revoked_at).length} Active
            </span>
          </div>

          {deviceActionMsg && (
            <div className="p-2.5 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs">
              {deviceActionMsg}
            </div>
          )}

          {devicesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyber-cyan" />
            </div>
          ) : devices.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No devices enrolled yet. Scan a QR challenge on your phone to register your device.
            </div>
          ) : (
            <div className="space-y-2.5">
              {devices.map((device) => {
                const isRevoked = Boolean(device.revoked_at);
                return (
                  <div
                    key={device.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      isRevoked
                        ? 'bg-cyber-900/40 border-cyber-700/40 opacity-50'
                        : 'bg-cyber-900 border-cyber-700/80'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-cyber-cyan" />
                        <span>{device.device_name}</span>
                        {isRevoked && (
                          <span className="text-[10px] text-rose-400 font-mono">(Revoked)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Last used: {new Date(device.last_used_at).toLocaleDateString()}
                      </div>
                    </div>

                    {!isRevoked && (
                      <button
                        onClick={() => handleRevokeDevice(device.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Revoke device authorization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
