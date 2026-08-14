import { useRef, useState, useCallback } from 'react';

interface WebcamOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export function useWebcam(options: WebcamOptions = {}) {
  const {
    facingMode = 'user',
    width = 1280,
    height = 720,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsActive(true);
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      console.error('Camera error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, width, height]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  const takeSnapshot = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready');
      return null;
    }

    try {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        setError('Failed to get canvas context');
        return null;
      }

      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      ctx.drawImage(videoRef.current, 0, 0);

      return canvasRef.current.toDataURL('image/jpeg', 0.9);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to take snapshot';
      setError(message);
      return null;
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    stopCamera();

    // Recursively call with new facingMode would require re-creating hook
    // For now, just stop and let caller handle restart with new options
  }, [facingMode, stopCamera]);

  return {
    videoRef,
    canvasRef,
    isActive,
    isLoading,
    error,
    startCamera,
    stopCamera,
    takeSnapshot,
    switchCamera,
  };
}
