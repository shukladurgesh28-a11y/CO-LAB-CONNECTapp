import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Scan,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  User,
  Wrench,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function QRScannerModal({ isOpen, onClose, onVerified, initialCode = '' }) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const scannedRef = useRef(false);
  const [liveDecode, setLiveDecode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setCameraError(null);
      scannedRef.current = false;
      startCamera();
      if (initialCode) {
        handleVerify(initialCode);
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, initialCode]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          beginLiveDecode();
        }
      } else {
        setCameraError('Webcam access not supported in this browser environment.');
      }
    } catch (err) {
      console.warn('Camera stream could not be started:', err.message);
      setCameraError('Camera unavailable or permission denied. Use interactive demo buttons or manual code entry below.');
      setCameraActive(false);
    }
  };

  // Live QR decoding via the native BarcodeDetector (Chrome/Edge).
  // No extra dependency; unsupported browsers fall back to manual entry.
  const beginLiveDecode = () => {
    if (!('BarcodeDetector' in window)) return;
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      return;
    }
    setLiveDecode(true);
    scanLoopRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || scannedRef.current) return;
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          scannedRef.current = true;
          clearInterval(scanLoopRef.current);
          scanLoopRef.current = null;
          const value = String(codes[0].rawValue).trim();
          setCode(value);
          handleVerify(value);
        }
      } catch {
        /* transient frame errors are ignored */
      }
    }, 600);
  };

  const stopCamera = () => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    setLiveDecode(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleVerify = async (scanCode, actionType = 'verify_only') => {
    const targetCode = scanCode || code;
    if (!targetCode) {
      toast.error('Please enter or select a verification code');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/bookings/scan-verify', {
        code: targetCode.trim(),
        action: actionType,
      });
      const data = res.data?.data || res.data;
      setResult(data);
      toast.success(res.data?.message || 'Verification successful!');
      if (onVerified) {
        onVerified(data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed. Code not found.';
      toast.error(msg);
      setResult({ error: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Scan className="w-6 h-6 text-blue-200 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Cooperative QR Scanner</h2>
              <p className="text-xs text-blue-200">On-Site Service & Worker ID Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Camera Area */}
        <div className="p-5 space-y-4">
          <div className="relative w-full aspect-video bg-gray-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-blue-400/40">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-gray-400">
                <Camera className="w-12 h-12 mx-auto mb-2 text-blue-400/60 animate-pulse" />
                <p className="text-xs text-gray-300 font-medium">Digital Optical Scanner Active</p>
                <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                  {cameraError || 'Align QR code within the highlighted corners'}
                </p>
              </div>
            )}

            {/* Target Crosshairs & Laser Animation */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="relative w-44 h-44 border-2 border-blue-400/80 rounded-xl">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Laser animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce mt-20" />
              </div>
            </div>

            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/70 bg-black/40 backdrop-blur-md px-3 py-1 rounded-md">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {liveDecode ? 'Live QR decode: point at a code' : 'Live Verification Engine'}
              </span>
              <span className="font-mono text-blue-300">256-Bit Signed</span>
            </div>
          </div>

          {/* Quick Demo Scan Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Scan Presets (Instant Simulation)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCode('CC-SVC-1');
                  handleVerify('CC-SVC-1');
                }}
                className="text-left p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 transition-colors"
              >
                <p className="text-xs font-semibold text-blue-900">Service Pass #1</p>
                <p className="text-[11px] text-blue-700 font-mono">CC-SVC-1 (Customer)</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCode('CC-WRK-1');
                  handleVerify('CC-WRK-1');
                }}
                className="text-left p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors"
              >
                <p className="text-xs font-semibold text-emerald-900">Worker Digital ID</p>
                <p className="text-[11px] text-emerald-700 font-mono">CC-WRK-1 (Verified)</p>
              </button>
            </div>
          </div>

          {/* Manual Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(code);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="e.g. CC-SVC-1 or CC-WRK-1"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading || !code}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Scan className="w-4 h-4" />
              )}
              Verify
            </button>
          </form>

          {/* Verification Result Card */}
          {result && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {result.error ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-900">Verification Failed</h4>
                    <p className="text-xs text-red-700 mt-0.5">{result.error}</p>
                  </div>
                </div>
              ) : result.type === 'worker' ? (
                /* Worker Verified Card */
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Cooperative Verified Worker
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 bg-emerald-600 text-white rounded-full font-medium">
                      Authentic
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-800 text-lg">
                      {result.name?.charAt(0) || 'W'}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">{result.name}</h4>
                      <p className="text-xs text-gray-600">{result.cooperative_name}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        🛡️ {result.badge}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100 text-xs">
                    <div>
                      <span className="text-gray-500">Rating:</span>{' '}
                      <span className="font-semibold text-gray-900">⭐ {result.rating || 5.0} / 5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Jobs Completed:</span>{' '}
                      <span className="font-semibold text-gray-900">{result.completed_jobs || 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Booking Verified Card */
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                        Verified Booking #{result.booking?.id}
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 bg-blue-600 text-white rounded-full font-medium capitalize">
                      {result.booking?.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service:</span>
                      <span className="font-semibold text-gray-900">
                        {result.booking?.service?.name || result.booking?.service_name || 'Standard Service'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer:</span>
                      <span className="font-medium text-gray-900">{result.booking?.customer_name || 'Verified Household'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-bold text-emerald-700">₹{result.booking?.total_amount || result.booking?.final_amount || 0}</span>
                    </div>
                  </div>

                  {/* Worker Action Buttons for On-Site verification */}
                  <div className="flex gap-2 pt-2 border-t border-blue-100">
                    <button
                      type="button"
                      onClick={() => handleVerify(code, 'start_service')}
                      disabled={loading}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      Verify & Start Service
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(code, 'complete_service')}
                      disabled={loading}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                    >
                      Verify & Complete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>CO-LAB CONNECT Digital Verification System</span>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900 font-medium px-3 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
