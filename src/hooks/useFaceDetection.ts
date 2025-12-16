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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar modelos de reconhecimento facial');
        console.error('Error loading face-api models:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const startVideo = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      videoRef.current = videoElement;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      videoElement.srcObject = stream;
      return true;
    } catch (err) {
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      console.error('Error accessing camera:', err);
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
    if (!isModelLoaded) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        return {
          descriptor: detection.descriptor,
          box: detection.detection.box,
        };
      }
      return null;
    } catch (err) {
      console.error('Error detecting face:', err);
      return null;
    }
  }, [isModelLoaded]);

  const compareFaces = useCallback((descriptor1: Float32Array, descriptor2: Float32Array): number => {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
  }, []);

  return {
    isLoading,
    isModelLoaded,
    error,
    startVideo,
    stopVideo,
    detectFace,
    compareFaces,
  };
};
