import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Scan,
  AlertCircle,
  Upload,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  VideoOff,
  SwitchCamera,
  Loader2,
  Info,
} from 'lucide-react';

export const QRScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [fileScanning, setFileScanning] = useState(false);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerContainerId = 'qr-reader-region';

  const navigate = useNavigate();

  const handleScanSuccess = (decodedText) => {
    stopScanner();

    let token = decodedText;
    if (decodedText.includes('token=')) {
      try {
        const url = new URL(decodedText, window.location.origin);
        token = url.searchParams.get('token') || decodedText;
      } catch {
        // Fallback to substring
        const match = decodedText.match(/token=([^&]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
    }

    navigate(`/qr-approve?token=${encodeURIComponent(token)}`);
  };

  // Fetch available cameras on mount
  useEffect(() => {
    const detectCameras = async () => {
      // Check if secure context
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setError(
          'Mobile browsers restrict live camera access over unencrypted HTTP (local IP). Use localhost, HTTPS (e.g. Vercel), or upload a screenshot below.'
        );
        return;
      }

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer back/environment camera for mobile, otherwise first available
          const backCam = devices.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[devices.length - 1].id);
        }
      } catch (err) {
        // Permissions not granted yet or no cameras found
        console.warn('Initial camera query notice:', err.message);
      }
    };

    detectCameras();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError('');
    setStarting(true);

    try {
      // Ensure any existing instance is cleaned up
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
      }

      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      // Determine camera target
      let cameraConfig;
      if (selectedCameraId) {
        cameraConfig = selectedCameraId;
      } else {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error('No webcam or camera device found on this system.');
        }
        setAvailableCameras(cameras);
        cameraConfig = cameras[cameras.length - 1].id;
        setSelectedCameraId(cameraConfig);
      }

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.75),
            height: Math.floor(minEdge * 0.75),
          };
        },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        cameraConfig,
        qrConfig,
        handleScanSuccess,
        () => {
          // Frame misses are normal while seeking
        }
      );

      setScanning(true);
    } catch (err) {
      console.error('Failed to start camera:', err);
      let msg = err.message || 'Unable to access camera hardware.';
      if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser address bar.';
      } else if (msg.includes('OverconstrainedError') || msg.includes('NotFoundError')) {
        msg = 'Requested camera is not available. Try selecting a different camera from the dropdown.';
      }
      setError(msg);
      setScanning(false);
    } finally {
      setStarting(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Stop scanner warning:', err);
      } finally {
        html5QrCodeRef.current = null;
        setScanning(false);
      }
    } else {
      setScanning(false);
    }
  };

  const switchCamera = async (newCameraId) => {
    setSelectedCameraId(newCameraId);
    if (scanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileScanning(true);

    try {
      const fileScanner = new Html5Qrcode('qr-file-temp-region');
      const decodedText = await fileScanner.scanFile(file, true);
      await fileScanner.clear();
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setError('Could not detect a valid QR code in the uploaded image. Please ensure the QR code is sharp and unobstructed.');
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    let token = manualToken.trim();
    if (token.includes('token=')) {
      try {
        const url = new URL(token, window.location.origin);
        token = url.searchParams.get('token') || token;
      } catch {
        const match = token.match(/token=([^&]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
    }

    navigate(`/qr-approve?token=${encodeURIComponent(token)}`);
  };

  return (
    <div className="max-w-xl mx-auto my-10 px-4 space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <Scan className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cryptographic QR Scanner</h1>
          <p className="text-sm text-slate-400">
            Scan the challenge displayed on the login terminal to verify and authorize access.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Camera Selector (If multiple cameras are available) */}
        {availableCameras.length > 1 && (
          <div className="flex items-center justify-between bg-cyber-900/60 p-2.5 rounded-xl border border-cyber-700/60 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-mono">
              <SwitchCamera className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Camera:</span>
            </span>
            <select
              value={selectedCameraId}
              onChange={(e) => switchCamera(e.target.value)}
              className="bg-cyber-800 text-slate-200 border border-cyber-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyber-cyan max-w-[200px] truncate"
            >
              {availableCameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video Viewport Area */}
        <div className="bg-cyber-900 border border-cyber-700 rounded-2xl overflow-hidden p-4 text-center relative">
          {/* Target container where html5-qrcode strictly injects the video stream */}
          <div
            id={scannerContainerId}
            className={`w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-black ${
              scanning ? 'min-h-[280px] block' : 'hidden'
            }`}
          />

          {/* Idle Placeholder */}
          {!scanning && (
            <div className="py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-cyber-800 flex items-center justify-center mx-auto text-slate-500">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Camera preview is ready</p>
                <p className="text-xs text-slate-400 mt-1">
                  Point your camera directly at the QR code displayed on the screen
                </p>
              </div>

              <button
                type="button"
                onClick={startScanner}
                disabled={starting}
                className="px-5 py-2.5 bg-cyber-cyan text-cyber-900 rounded-xl font-bold text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow inline-flex items-center gap-2 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening Camera...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scanner</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Active Controls */}
          {scanning && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-1.5 bg-rose-600/90 text-white rounded-lg text-xs font-semibold hover:bg-rose-600 transition-colors flex items-center gap-1.5"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Hidden region for file scanning */}
        <div id="qr-file-temp-region" className="hidden" />

        {/* Alternative 1: Upload QR Image / Screenshot */}
        <div className="bg-cyber-900/40 border border-cyber-700/60 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Upload QR Screenshot / Photo</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Have a screenshot or image of the QR code? Scan it instantly.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileScanning}
              className="px-3 py-1.5 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan border border-cyber-cyan/30 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              {fileScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alternative 2: Manual Token Input */}
        <div className="pt-2 border-t border-cyber-700/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <KeyRound className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Direct Token / URL Entry:</span>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste signed token or full scanned URL..."
              className="w-full px-3.5 py-2.5 bg-cyber-900 border border-cyber-700 rounded-xl text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyber-cyan"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan border border-cyber-cyan/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Inspect Token Payload</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
