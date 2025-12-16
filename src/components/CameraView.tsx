import React, { useRef, useEffect, useState } from 'react';
import { useFaceDetection, DetectedFace } from '@/hooks/useFaceDetection';
import { Loader2, Camera, CameraOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraViewProps {
  onFaceDetected?: (face: DetectedFace) => void;
  onCapture?: (imageData: string, face: DetectedFace) => void;
  showCaptureButton?: boolean;
  className?: string;
  autoDetect?: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({
  onFaceDetected,
  onCapture,
  showCaptureButton = false,
  className,
  autoDetect = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [currentFace, setCurrentFace] = useState<DetectedFace | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const { isLoading, isModelLoaded, error, startVideo, stopVideo, detectFace } = useFaceDetection();

  useEffect(() => {
    const initCamera = async () => {
      if (videoRef.current && isModelLoaded) {
        const success = await startVideo(videoRef.current);
        setIsVideoStarted(success);
      }
    };

    initCamera();

    return () => {
      stopVideo();
    };
  }, [isModelLoaded, startVideo, stopVideo]);

  useEffect(() => {
    if (!isVideoStarted || !autoDetect) return;

    let animationId: number;
    let lastDetectionTime = 0;
    const detectionInterval = 200; // ms

    const detect = async (timestamp: number) => {
      if (timestamp - lastDetectionTime > detectionInterval && videoRef.current) {
        lastDetectionTime = timestamp;
        const face = await detectFace(videoRef.current);
        setCurrentFace(face);
        if (face && onFaceDetected) {
          onFaceDetected(face);
        }
      }
      animationId = requestAnimationFrame(detect);
    };

    animationId = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isVideoStarted, autoDetect, detectFace, onFaceDetected]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !currentFace) return;

    setIsCapturing(true);
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      if (onCapture) {
        onCapture(imageData, currentFace);
      }
    }
    
    setIsCapturing(false);
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-card rounded-lg p-8", className)}>
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando modelos de reconhecimento facial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-card rounded-lg p-8", className)}>
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-card", className)}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Face detection overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          "absolute inset-4 border-4 rounded-lg transition-colors duration-300",
          currentFace ? "border-primary" : "border-muted"
        )} />
        
        {/* Status indicator */}
        <div className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium",
          currentFace 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          {currentFace ? (
            <span className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
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

      {showCaptureButton && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
          <Button
            onClick={handleCapture}
            disabled={!currentFace || isCapturing}
            size="lg"
            className="rounded-full w-16 h-16"
          >
            {isCapturing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CameraView;
