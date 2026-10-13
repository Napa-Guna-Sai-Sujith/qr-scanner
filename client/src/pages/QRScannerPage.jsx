import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  Camera,
  Scan,
  AlertCircle,
  Upload,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  VideoOff,
  SwitchCamera,
  Loader2,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const QRScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [fileScanning, setFileScanning] = useState(false);
  const [detectedResult, setDetectedResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  const handleScanSuccess = useCallback(
    (decodedText) => {
      // Stop scanner loop
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setScanning(false);
      setDetectedResult(decodedText);

      let token = decodedText;
      if (decodedText.includes('token=')) {
        try {
          const url = new URL(decodedText, window.location.origin);
          token = url.searchParams.get('token') || decodedText;
        } catch {
          const match = decodedText.match(/token=([^&]+)/);
          if (match) token = decodeURIComponent(match[1]);
        }
      }

      // Small delay for user to see the success state
      setTimeout(() => {
        navigate(`/qr-approve?token=${encodeURIComponent(token)}`);
      }, 500);
    },
    [navigate]
  );

  // Stop camera tracks cleanly
  const stopScanner = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    setStarting(false);
  }, []);

  // Frame processing loop with jsQR
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && code.data.trim()) {
      handleScanSuccess(code.data.trim());
      return;
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [handleScanSuccess]);

  // Query camera devices on mount
  useEffect(() => {
    const detectCameras = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length > 0) {
          setAvailableCameras(videoDevices);
          const backCam = videoDevices.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.warn('Camera enumeration error:', err);
      }
    };

    detectCameras();

    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const startScanner = async (overrideCameraId = null) => {
    setError('');
    setStarting(true);
    setDetectedResult(null);

    // Check secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError(
        'Mobile browsers require HTTPS to access camera hardware. Use localhost, deploy to Vercel/HTTPS, or upload a QR screenshot below.'
      );
      setStarting(false);
      return;
    }

    // Stop any existing stream
    stopScanner();

    const targetCameraId = overrideCameraId || selectedCameraId;

    const constraints = {
      video: targetCameraId
        ? { deviceId: { exact: targetCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to basic video without deviceId/exact constraints if the specific device failed
        console.warn('Exact constraint failed, trying fallback:', firstErr.message);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;

      // Re-enumerate cameras now that permission has been granted (labels are now visible)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length > 0) {
          setAvailableCameras(videoDevices);
          const activeTrack = stream.getVideoTracks()[0];
          const activeSettings = activeTrack.getSettings?.();
          if (activeSettings?.deviceId) {
            setSelectedCameraId(activeSettings.deviceId);
          }
        }
      } catch (enumErr) {
        console.warn('Post-permission enum warning:', enumErr);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        videoRef.current.muted = true;
        await videoRef.current.play();

        setScanning(true);
        setStarting(false);

        // Start frame scanning loop
        animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error('getUserMedia error:', err);
      let msg = err.message || 'Unable to access camera hardware.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on your device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another application (e.g. Zoom, Teams, or another browser tab) or has its physical privacy shutter closed.';
      }
      setError(msg);
      setScanning(false);
      setStarting(false);
    }
  };

  const handleCameraChange = async (newDeviceId) => {
    setSelectedCameraId(newDeviceId);
    if (scanning) {
      await startScanner(newDeviceId);
    }
  };

  // Scan from uploaded photo/screenshot using jsQR
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileScanning(true);
    setDetectedResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Failed to process image context.');
          setFileScanning(false);
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data && code.data.trim()) {
          setFileScanning(false);
          handleScanSuccess(code.data.trim());
        } else {
          setFileScanning(false);
          setError(
            'Could not find a valid QR code in this image. Please ensure the QR code is clearly visible and in focus.'
          );
        }
      };
      img.onerror = () => {
        setFileScanning(false);
        setError('Failed to load image file.');
      };
      img.src = event.target?.result;
    };
    reader.onerror = () => {
      setFileScanning(false);
      setError('Failed to read file.');
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="max-w-xl mx-auto my-6 sm:my-10 px-4 space-y-5 sm:space-y-6">
      <div className="bg-cyber-850 border border-cyber-700/80 rounded-2xl p-5 sm:p-8 shadow-xl space-y-5 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
            <Scan className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Cryptographic QR Scanner</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Scan the challenge displayed on the login terminal to verify and authorize access.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Camera Notice:</span>
              <span className="leading-relaxed">{error}</span>
            </div>
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
              onChange={(e) => handleCameraChange(e.target.value)}
              className="bg-cyber-800 text-slate-200 border border-cyber-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyber-cyan max-w-[200px] truncate"
            >
              {availableCameras.map((cam, idx) => (
                <option key={cam.deviceId || idx} value={cam.deviceId}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Camera Viewport Area */}
        <div className="bg-cyber-900 border border-cyber-700 rounded-2xl overflow-hidden p-3 sm:p-4 text-center relative">
          {/* Active Live Video Stream */}
          <div className={`relative w-full max-w-sm mx-auto aspect-[4/3] rounded-xl overflow-hidden bg-black ${scanning ? 'block' : 'hidden'}`}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-xl"
              autoPlay
              playsInline
              muted
            />

            {/* Hidden canvas used exclusively by jsQR to sample image data */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Cyber Reticle & Scanner Overlay */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Target Finder Box */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-cyber-cyan/50 rounded-2xl relative">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan" />
                  {/* Scanning Laser Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent animate-pulse absolute top-1/2 -translate-y-1/2 shadow-glow" />
                </div>
              </div>
            )}
          </div>

          {/* Success Overlay */}
          {detectedResult && (
            <div className="absolute inset-0 bg-cyber-900/90 flex flex-col items-center justify-center p-4 space-y-2 z-10">
              <CheckCircle2 className="w-12 h-12 text-cyber-emerald animate-bounce" />
              <p className="text-sm font-bold text-white">QR Code Detected!</p>
              <p className="text-xs text-cyber-cyan font-mono">Redirecting to approval...</p>
            </div>
          )}

          {/* Idle Placeholder */}
          {!scanning && !detectedResult && (
            <div className="py-8 sm:py-10 space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cyber-800 flex items-center justify-center mx-auto text-slate-500">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">Camera preview is ready</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click below to open your camera and point it at the QR challenge code.
                </p>
              </div>

              <button
                type="button"
                onClick={() => startScanner()}
                disabled={starting}
                className="w-full sm:w-auto px-6 py-3 bg-cyber-cyan text-cyber-900 rounded-xl font-bold text-xs sm:text-sm hover:bg-cyber-cyanGlow transition-all shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening Camera Stream...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scanner</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <Info className="w-3.5 h-3.5" />
                <span>Laptop users: ensure your physical webcam shutter is open.</span>
              </div>
            </div>
          )}

          {/* Active Controls */}
          {scanning && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={stopScanner}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600/90 text-white rounded-lg text-xs font-semibold hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Alternative 1: Upload QR Image / Screenshot */}
        <div className="bg-cyber-900/50 border border-cyber-700/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
              <span>Upload QR Screenshot / Photo</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Works instantly on any device without camera access.
            </p>
          </div>

          <div className="w-full sm:w-auto">
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
              className="w-full sm:w-auto px-4 py-2.5 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan border border-cyber-cyan/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {fileScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Image...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File</span>
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
              className="w-full py-3 px-4 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan border border-cyber-cyan/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
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
