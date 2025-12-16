import { useEffect, useState, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export interface DetectedFace {
  descriptor: Float32Array;
  box: faceapi.Box;
}

export const useFaceDetection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Iniciando carregamento dos modelos de reconhecimento facial...');
        setLoadingProgress('Carregando detector de rosto...');
        
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        console.log('SSD Mobilenet carregado');
        
        setLoadingProgress('Carregando landmarks faciais...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('Face landmarks carregado');
        
        setLoadingProgress('Carregando modelo de reconhecimento...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('Face recognition carregado');
        
        setIsModelLoaded(true);
        setLoadingProgress('');
        console.log('Todos os modelos carregados com sucesso!');
      } catch (err) {
        console.error('Erro ao carregar modelos:', err);
        setError('Erro ao carregar modelos. Verifique sua conexão com a internet.');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const startVideo = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      videoRef.current = videoElement;
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      console.log('Solicitando acesso à câmera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
        },
      });
      
      streamRef.current = stream;
      videoElement.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          console.log('Câmera iniciada:', videoElement.videoWidth, 'x', videoElement.videoHeight);
          resolve();
        };
      });
      
      return true;
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      return false;
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const detectFace = useCallback(async (videoElement: HTMLVideoElement): Promise<DetectedFace | null> => {
    if (!isModelLoaded) {
      console.log('Modelos não carregados ainda');
      return null;
    }

    if (videoElement.readyState !== 4) {
      return null;
    }

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        console.log('Rosto detectado com confiança:', detection.detection.score);
        return {
          descriptor: detection.descriptor,
          box: detection.detection.box,
        };
      }
      return null;
    } catch (err) {
      console.error('Erro na detecção:', err);
      return null;
    }
  }, [isModelLoaded]);

  const compareFaces = useCallback((descriptor1: Float32Array | number[], descriptor2: Float32Array | number[]): number => {
    const arr1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
    const arr2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);
    return faceapi.euclideanDistance(arr1, arr2);
  }, []);

  return {
    isLoading,
    isModelLoaded,
    error,
    loadingProgress,
    startVideo,
    stopVideo,
    detectFace,
    compareFaces,
  };
};
