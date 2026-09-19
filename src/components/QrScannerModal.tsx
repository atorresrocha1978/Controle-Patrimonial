import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  AlertCircle, 
  Check, 
  Search, 
  QrCode, 
  Smartphone,
  Layers
} from 'lucide-react';
import jsQR from 'jsqr';
import { PatrimonialAsset } from '../types';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
  assets: PatrimonialAsset[];
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  assets
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play audio beep on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted
    }
  };

  const handleDetectedCode = (scannedText: string) => {
    playBeep();
    // Try to parse JSON payload or plain code
    let codeToUse = scannedText.trim();
    try {
      const parsed = JSON.parse(scannedText);
      if (parsed.patrimonio) {
        codeToUse = parsed.patrimonio;
      }
    } catch {
      // It's raw text
    }

    stopCamera();
    onScanSuccess(codeToUse);
    onClose();
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    setScanning(true);
    try {
      const constraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrame();
      }
    } catch (err: any) {
      console.warn('Câmera indisponível ou permissão negada:', err);
      setCameraError('Não foi possível acessar a câmera do dispositivo (permissão ou dispositivo não encontrado). Você pode utilizar o upload de imagem ou busca direta abaixo.');
      setScanning(false);
      setActiveMode('upload');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Handle uploaded image file with QR code
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height);
          if (qr && qr.data) {
            handleDetectedCode(qr.data);
          } else {
            alert('Nenhum código QR detectado na imagem enviada. Verifique a nitidez ou digite o código manualmente.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen && activeMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Rastrear Ativo por QR Code</h3>
              <p className="text-[11px] text-slate-400">Aponte a câmera ou carregue a foto da etiqueta</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveMode('camera')}
            className={`flex-1 py-2.5 font-medium flex items-center justify-center space-x-1.5 transition-colors ${
              activeMode === 'camera'
                ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Câmera ao Vivo</span>
          </button>
          <button
            onClick={() => setActiveMode('upload')}
            className={`flex-1 py-2.5 font-medium flex items-center justify-center space-x-1.5 transition-colors ${
              activeMode === 'upload'
                ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload de Foto</span>
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2.5 font-medium flex items-center justify-center space-x-1.5 transition-colors ${
              activeMode === 'manual'
                ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Digitar / Selecionar</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {activeMode === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>Aviso de Acesso à Câmera</span>
                  </div>
                  <p>{cameraError}</p>
                </div>
              ) : (
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Target scanner HUD overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-indigo-400/80 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-0.5 -ml-0.5" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-0.5 -mr-0.5" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-0.5 -ml-0.5" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-0.5 -mr-0.5" />
                      <div className="w-full h-0.5 bg-indigo-400/80 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-sm shadow-indigo-400" />
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-center text-slate-400">
                Posicione o código QR da plaqueta de patrimônio dentro da mira.
              </p>
            </div>
          )}

          {activeMode === 'upload' && (
            <div className="space-y-4 text-center">
              <label className="block w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 cursor-pointer bg-slate-950/40 hover:bg-slate-900/60 transition-all">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-950/60 text-indigo-400 flex items-center justify-center border border-indigo-800/60">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-400">Clique para selecionar imagem</span>
                    <p className="text-[11px] text-slate-500 mt-1">Formatos suportados: PNG, JPG, JPEG, WebP</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-400">
                Tire uma foto ou carregue uma imagem salva da plaqueta de patrimônio com código QR.
              </p>
            </div>
          )}

          {activeMode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Número de Patrimônio ou Código
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Ex: PAT-2024-001"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={() => manualCode && handleDetectedCode(manualCode)}
                    disabled={!manualCode}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Ou clique para testar em um item existente:
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {assets.slice(0, 6).map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleDetectedCode(asset.code)}
                      className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-indigo-400 font-mono">{asset.code}</span>
                          <span className="text-xs text-slate-200 truncate">{asset.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{asset.location.room}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 group-hover:text-indigo-300 font-medium">
                        Consultar →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
