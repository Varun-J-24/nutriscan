import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

const getLegacyGetUserMedia = () =>
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;

const getUserMediaCompat = async (constraints) => {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacy = getLegacyGetUserMedia();
  if (!legacy) {
    throw new Error('camera-api-unavailable');
  }

  return new Promise((resolve, reject) => {
    legacy.call(navigator, constraints, resolve, reject);
  });
};

const humanizeScannerError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('camera-api-unavailable')) {
    return 'Camera API is unavailable in this browser context. Use localhost/HTTPS or upload a barcode image.';
  }

  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Camera permission denied. Please allow camera access and retry.';
  }

  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') {
    return 'No compatible camera found on this device.';
  }

  if (message.includes('insecure') || (!window.isSecureContext && !location.hostname.includes('localhost'))) {
    return 'Camera requires a secure context. Open on localhost or HTTPS.';
  }

  return error?.message || 'Unable to initialize camera. Please allow camera access.';
};

export const useBarcodeScanner = ({ videoRef, active, onDetected }) => {
  const readerRef = useRef(new BrowserMultiFormatReader());
  const controlsRef = useRef(null);
  const streamRef = useRef(null);
  const lastDetectedRef = useRef({ code: null, at: 0 });

  const [scannerError, setScannerError] = useState('');

  const cameraSupported = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return Boolean(navigator.mediaDevices?.getUserMedia || getLegacyGetUserMedia());
  }, []);

  const emitDetected = (rawCode) => {
    const code = rawCode?.trim();
    if (!code) return;

    const now = Date.now();
    if (
      lastDetectedRef.current.code === code &&
      now - lastDetectedRef.current.at < 3000
    ) {
      return;
    }

    lastDetectedRef.current = { code, at: now };
    onDetected(code);
  };

  useEffect(() => {
    if (!active || !videoRef.current) {
      return;
    }

    let cancelled = false;

    const stopAll = () => {
      if (controlsRef.current?.stop) {
        controlsRef.current.stop();
      }

      if (streamRef.current?.getTracks) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      controlsRef.current = null;
      streamRef.current = null;
    };

    const start = async () => {
      setScannerError('');

      try {
        const stream = await getUserMediaCompat({
          video: {
            facingMode: { ideal: 'environment' }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch {
          // Ignore autoplay failures; zxing still attempts decode when frames are available.
        }

        controlsRef.current = await readerRef.current.decodeFromVideoElement(
          videoRef.current,
          (result) => {
            if (cancelled || !result) return;
            emitDetected(result.getText());
          }
        );
      } catch (error) {
        stopAll();
        setScannerError(humanizeScannerError(error));
      }
    };

    start();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [active, onDetected, videoRef]);

  const scanImageFile = async (file) => {
    if (!file) return null;

    setScannerError('');
    const objectUrl = URL.createObjectURL(file);

    try {
      const result = await readerRef.current.decodeFromImageUrl(objectUrl);
      const code = result?.getText?.();
      if (!code) {
        throw new Error('No barcode found in image.');
      }
      emitDetected(code);
      return code;
    } catch (error) {
      setScannerError('Could not read barcode from this image. Try a clearer, well-lit barcode photo.');
      throw error;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  return {
    scannerError,
    cameraSupported,
    scanImageFile,
    clearScannerError: () => setScannerError('')
  };
};
