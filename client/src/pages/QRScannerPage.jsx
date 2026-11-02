import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  Camera,
  Scan,
  AlertCircle,
  AlertTriangle,
  Upload,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  VideoOff,
  SwitchCamera,
  Loader2,
  Info,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  RefreshCw,
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
  const [isCameraBlack, setIsCameraBlack] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  const mobileCameraInputRef = useRef(null);
  const frameCountRef = useRef(0);
  const blackFramesRef = useRef(0);

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
      setIsCameraBlack(false);
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
    setIsCameraBlack(false);
    blackFramesRef.current = 0;
    frameCountRef.current = 0;
  }, []);

  // Frame processing loop with jsQR
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
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

    // Black frame detection: check average brightness across sample pixels every 15 frames
    frameCountRef.current += 1;
    if (frameCountRef.current % 15 === 0) {
      const data = imageData.data;
      const totalPixels = 30;
      const step = Math.max(1, Math.floor(data.length / (totalPixels * 4)));
      let sumLuma = 0;
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * step * 4;
        sumLuma += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      }
      const avgLuma = sumLuma / totalPixels;

      if (avgLuma < 3) {
        blackFramesRef.current += 1;
        // If 3 consecutive samples (~1.5 seconds) are completely black, flag it
        if (blackFramesRef.current >= 3) {
          setIsCameraBlack(true);
        }
      } else {
        blackFramesRef.current = 0;
        setIsCameraBlack(false);
      }
    }

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
    setIsCameraBlack(false);
    blackFramesRef.current = 0;
    frameCountRef.current = 0;

    // Check secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError(
        'Mobile web browsers require HTTPS to stream live camera hardware. Please use localhost, deploy with HTTPS, or tap "Snap Photo / Upload File" below.'
      );
      setStarting(false);
      return;
    }

    // Stop any active stream first
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const targetCameraId = overrideCameraId || selectedCameraId;

    const constraints = {
      video: targetCameraId
        ? { deviceId: { exact: targetCameraId } }
        : { facingMode: { ideal: 'environment' } },
      audio: false,
    };

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to basic video without exact constraints
        console.warn('Exact camera constraint failed, using generic video:', firstErr.message);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;

      // Re-enumerate cameras now that user has permitted access (labels become visible)
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
        console.warn('Post-permission camera enum warning:', enumErr);
      }

      // Mark scanning active immediately so the DOM viewport is active
      setScanning(true);
      setStarting(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;

        // Wait for video metadata to be loaded before calling play()
        const playPromise = new Promise((resolve) => {
          if (videoRef.current.readyState >= 1) {
            resolve();
          } else {
            videoRef.current.onloadedmetadata = () => resolve();
            setTimeout(resolve, 350); // Fallback
          }
        });

        await playPromise;

        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('video.play() auto-play warning:', playErr);
        }

        // Start frame scanning loop
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
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
        msg = 'Camera is currently in use by another application (Zoom, Teams, or another browser window) or is physically locked.';
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

  // Process an image file or blob from file-picker or clipboard paste
  const processImageFile = useCallback(
    (file) => {
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
            setError('Failed to process image canvas context.');
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
              'No valid QR code found in this image. Please ensure the QR code is clearly visible, well-lit, and in focus.'
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
        setError('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    },
    [handleScanSuccess]
  );

  // Global Paste Handler (Ctrl + V): seamlessly paste screenshots or copied tokens
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob);
            e.preventDefault();
            return;
          }
        }
      }

      // Check for pasted text containing a token or URL
      const text = e.clipboardData?.getData('text');
      if (text && (text.includes('token=') || (text.includes('.') && text.length > 40))) {
        setManualToken(text.trim());
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageFile]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    if (e.target) e.target.value = '';
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
              <span className="font-semibold block">Scanner Notice:</span>
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
          {/* Video Container (Always sized and rendered to avoid display:none blank video bugs) */}
          <div className="relative w-full max-w-sm mx-auto aspect-[4/3] rounded-xl overflow-hidden bg-black border border-cyber-700/60">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-xl"
              autoPlay
              playsInline
              muted
            />

            {/* Hidden canvas used exclusively by jsQR to sample image data */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Cyber Reticle & Scanner Overlay (when scanning and feed is good) */}
            {scanning && !isCameraBlack && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Target Finder Box */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-cyber-cyan/50 rounded-2xl relative shadow-glow">
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

            {/* Black Screen Detection Warning Overlay */}
            {scanning && isCameraBlack && (
              <div className="absolute inset-2 sm:inset-3 p-3 bg-amber-950/95 border border-amber-500/60 rounded-xl text-amber-200 text-xs shadow-2xl backdrop-blur-md flex flex-col justify-between text-left z-20 animate-fade-in">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Camera Video is Pitch Black</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-100/90">
                    Your webcam is connected, but sending completely black frames. On laptops (Lenovo, HP, Dell, Asus):
                  </p>
                  <ul className="text-[11px] space-y-1 text-amber-200/90 list-disc list-inside">
                    <li>
                      <strong>Check physical shutter:</strong> Look directly above the camera lens and slide open the tiny physical cover switch.
                    </li>
                    <li>
                      <strong>Camera toggle key:</strong> Press <code className="bg-amber-900/60 px-1 rounded text-white">F8</code> or <code className="bg-amber-900/60 px-1 rounded text-white">Fn + F10</code>.
                    </li>
                    <li>
                      <strong>Lenovo Vantage:</strong> Disable &quot;Camera Privacy Mode&quot; in Lenovo Vantage settings.
                    </li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-amber-500/30 flex items-center justify-between text-[11px]">
                  <span className="text-amber-300/80">Can&apos;t open shutter?</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-amber-500 text-slate-900 font-bold rounded-lg hover:bg-amber-400 transition-colors"
                  >
                    Upload QR Screenshot Instead
                  </button>
                </div>
              </div>
            )}

            {/* Success Overlay */}
            {detectedResult && (
              <div className="absolute inset-0 bg-cyber-900/95 flex flex-col items-center justify-center p-4 space-y-2 z-30">
                <CheckCircle2 className="w-12 h-12 text-cyber-emerald animate-bounce" />
                <p className="text-sm font-bold text-white">QR Code Detected!</p>
                <p className="text-xs text-cyber-cyan font-mono">Redirecting to authorization...</p>
              </div>
            )}

            {/* Idle Placeholder (Overlaid when scanner is stopped) */}
            {!scanning && !detectedResult && (
              <div className="absolute inset-0 bg-cyber-900/95 flex flex-col items-center justify-center p-6 space-y-4 z-10">
                <div className="w-14 h-14 rounded-full bg-cyber-800 flex items-center justify-center text-slate-400">
                  <Camera className="w-7 h-7 text-cyber-cyan" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-slate-200">Live Camera Scanner</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Point your camera at the QR challenge code on the login terminal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startScanner()}
                  disabled={starting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-cyber-cyan text-cyber-900 rounded-xl font-bold text-xs sm:text-sm hover:bg-cyber-cyanGlow transition-all shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating Stream...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Start Camera Scanner</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <Info className="w-3.5 h-3.5 text-cyber-cyan/60 shrink-0" />
                  <span>Laptop users: ensure your physical camera shutter is slid open.</span>
                </div>
              </div>
            )}
          </div>

          {/* Active Controls */}
          {scanning && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-2 bg-rose-600/90 text-white rounded-lg text-xs font-semibold hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
              {isCameraBlack && (
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="px-3.5 py-2 bg-cyber-800 hover:bg-cyber-700 text-slate-200 rounded-lg text-xs font-semibold border border-cyber-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Reload Feed</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Alternative 1: Upload QR Image / Native Phone Camera */}
        <div className="bg-cyber-900/50 border border-cyber-700/60 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
                <span>Upload QR Screenshot or Photo</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Works on any computer or mobile device without WebRTC camera permissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Desktop/File Picker Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {/* Native Mobile Camera Snap Input */}
              <input
                type="file"
                ref={mobileCameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => mobileCameraInputRef.current?.click()}
                disabled={fileScanning}
                className="w-full sm:w-auto px-3.5 py-2 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan border border-cyber-cyan/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap Photo (Mobile)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileScanning}
                className="w-full sm:w-auto px-3.5 py-2 bg-cyber-800 hover:bg-cyber-700 text-slate-200 border border-cyber-700 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
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

          {/* Quick paste helper notice */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-cyber-900/80 px-3 py-2 rounded-lg border border-cyber-800">
            <Clipboard className="w-3.5 h-3.5 text-cyber-cyan shrink-0" />
            <span>
              <strong>Tip:</strong> Press <code className="text-cyber-cyan font-mono bg-cyber-950 px-1 rounded">Ctrl + V</code> anywhere on this page to paste a screenshot (<code className="text-slate-300 font-mono">Win + Shift + S</code>).
            </span>
          </div>
        </div>

        {/* Alternative 2: Direct Token / URL Entry */}
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
              className="w-full py-3 px-4 bg-cyber-800 hover:bg-cyber-700 text-cyber-cyan border border-cyber-cyan/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Inspect Token Payload</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Local Single-Device Testing Helper */}
        <div className="p-3 bg-cyber-900/40 rounded-xl border border-cyber-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span>Testing locally on this computer?</span>
            </span>
            <a
              href="/qr-login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-cyan hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
            >
              <span>Open /qr-login terminal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Since your laptop webcam points at you (not at your own screen), open the QR Login in a separate tab, snip the QR code with <code className="text-slate-300 font-mono">Win + Shift + S</code>, and press <code className="text-slate-300 font-mono">Ctrl + V</code> here.
          </p>
        </div>
      </div>
    </div>
  );
};
