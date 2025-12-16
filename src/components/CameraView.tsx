import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useFaceDetection, DetectedFace } from '@/hooks/useFaceDetection';
import { Loader2, Camera, CameraOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraViewProps {
  onFaceDetected?: (face: DetectedFace) => void;
  onCapture?: (imageData: string, face: DetectedFace) => void;
  showCaptureButton?: boolean;
  className?: string;
  autoDetect?: boolean;
}

export interface CameraViewRef {
  capturePhoto: () => Promise<{ imageData: string; face: DetectedFace } | null>;
}

const CameraView = forwardRef<CameraViewRef, CameraViewProps>(({
  onFaceDetected,
  onCapture,
  showCaptureButton = false,
  className,
  autoDetect = true,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [currentFace, setCurrentFace] = useState<DetectedFace | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);

  const { isLoading, isModelLoaded, error, loadingProgress, startVideo, stopVideo, detectFace } = useFaceDetection();

  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      if (videoRef.current && isModelLoaded) {
        console.log('Iniciando câmera...');
        const success = await startVideo(videoRef.current);
        if (mounted) {
          setIsVideoStarted(success);
          console.log('Câmera iniciada:', success);
        }
      }
    };

    if (isModelLoaded) {
      initCamera();
    }

    return () => {
      mounted = false;
      stopVideo();
    };
  }, [isModelLoaded, startVideo, stopVideo]);

  useEffect(() => {
    if (!isVideoStarted || !autoDetect) return;

    let animationId: number;
    let isDetecting = false;

    const detect = async () => {
      if (isDetecting || !videoRef.current) {
        animationId = requestAnimationFrame(detect);
        return;
      }
      
      isDetecting = true;
      
      try {
        const face = await detectFace(videoRef.current);
        
        if (face) {
          setCurrentFace(face);
          setDetectionCount(prev => prev + 1);
          if (onFaceDetected) {
            onFaceDetected(face);
          }
        } else {
          setCurrentFace(null);
        }
      } catch (err) {
        console.error('Erro na detecção:', err);
      }
      
      isDetecting = false;
      
      // Reduce detection frequency to prevent overload
      setTimeout(() => {
        animationId = requestAnimationFrame(detect);
      }, 300);
    };

    animationId = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isVideoStarted, autoDetect, detectFace, onFaceDetected]);

  const capturePhoto = useCallback(async (): Promise<{ imageData: string; face: DetectedFace } | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    // Force a fresh detection
    const face = await detectFace(videoRef.current);
    if (!face) {
      console.log('Nenhum rosto detectado para captura');
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Foto capturada com sucesso');
      return { imageData, face };
    }
    
    return null;
  }, [detectFace]);

  useImperativeHandle(ref, () => ({
    capturePhoto,
  }));

  const handleCapture = async () => {
    setIsCapturing(true);
    
    const result = await capturePhoto();
    
    if (result && onCapture) {
      onCapture(result.imageData, result.face);
    }
    
    setIsCapturing(false);
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-card rounded-lg p-8 min-h-[300px]", className)}>
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-foreground font-medium">Carregando reconhecimento facial...</p>
        {loadingProgress && (
          <p className="text-sm text-muted-foreground mt-2">{loadingProgress}</p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-card rounded-lg p-8 min-h-[300px]", className)}>
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive text-center font-medium">{error}</p>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Tente recarregar a página ou verificar as permissões da câmera.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-secondary", className)}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover mirror"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Face detection overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Guide frame */}
        <div className={cn(
          "absolute inset-8 border-4 rounded-2xl transition-all duration-300",
          currentFace 
            ? "border-primary shadow-[0_0_20px_rgba(234,88,12,0.4)]" 
            : "border-muted-foreground/50"
        )} />
        
        {/* Status indicator at bottom */}
        <div className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
          currentFace 
            ? "bg-primary text-primary-foreground" 
            : "bg-secondary/90 text-foreground"
        )}>
          {currentFace ? (
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Rosto detectado
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CameraOff className="w-4 h-4" />
              Posicione o rosto
            </span>
          )}
        </div>
      </div>

      {/* Capture button */}
      {showCaptureButton && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-auto">
          <Button
            onClick={handleCapture}
            disabled={!currentFace || isCapturing}
            size="lg"
            className={cn(
              "rounded-full w-20 h-20 shadow-lg transition-all duration-300",
              currentFace ? "scale-100 opacity-100" : "scale-90 opacity-50"
            )}
          >
            {isCapturing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Camera className="w-8 h-8" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
});

CameraView.displayName = 'CameraView';

export default CameraView;
