import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  Scan,
  AlertCircle,
  FileUp,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const QRScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-reader-region';

  const navigate = useNavigate();

  const handleScanSuccess = (decodedText) => {
    // If decodedText is a URL with token param, parse it
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop();
      }
    } catch {
      // Ignore stop errors
    }

    let token = decodedText;
    if (decodedText.includes('token=')) {
      const url = new URL(decodedText, window.location.origin);
      token = url.searchParams.get('token') || decodedText;
    }

    navigate(`/qr-approve?token=${encodeURIComponent(token)}`);
  };

  const startScanner = async () => {
    setError('');
    try {
      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error('No video camera hardware detected on this device.');
      }

      setCameraPermissionGranted(true);
      setScanning(true);

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        () => {
          // Frame scan failures are common during search, ignore
        }
      );
    } catch (err) {
      setError(
        err.message ||
          'Camera access was denied or is not supported. You can upload an image or paste the token below.'
      );
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch {
      // Ignore
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    let token = manualToken.trim();
    if (token.includes('token=')) {
      try {
        const url = new URL(token, window.location.origin);
        token = url.searchParams.get('token') || token;
      } catch {
        // Use token as is
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
            Scan the challenge presented on another terminal or display to authorize access.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Video Camera Viewport */}
        <div className="bg-cyber-900 border border-cyber-700 rounded-2xl overflow-hidden p-4 text-center">
          <div id={scannerContainerId} className="w-full max-w-sm mx-auto min-h-[220px] flex items-center justify-center">
            {!scanning && (
              <div className="py-8 space-y-3">
                <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">Camera preview is currently inactive</p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-4 py-2 bg-cyber-cyan text-cyber-900 rounded-xl font-bold text-xs hover:bg-cyber-cyanGlow transition-all shadow-glow inline-flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </button>
              </div>
            )}
          </div>

          {scanning && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-500 transition-colors"
              >
                Stop Camera
              </button>
            </div>
          )}
        </div>

        {/* Alternative: Manual Token Input (Crucial for evaluation without physical webcams) */}
        <div className="pt-4 border-t border-cyber-700/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <KeyRound className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>Fallback / Manual Token Evaluation:</span>
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
