import Tesseract from 'tesseract.js';

const frameToBlob = (videoEl) => {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;

  const context = canvas.getContext('2d');
  context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to capture camera frame.'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg');
  });
};

export const detectExpiryFromVideo = async (videoEl) => {
  if (!videoEl?.videoWidth || !videoEl?.videoHeight) {
    throw new Error('Camera stream is not ready yet.');
  }

  const blob = await frameToBlob(videoEl);

  const result = await Tesseract.recognize(blob, 'eng', {
    logger: () => {}
  });

  const rawText = result?.data?.text || '';
  const ocrConfidence = typeof result?.data?.confidence === 'number'
    ? Number((result.data.confidence / 100).toFixed(2))
    : null;

  return {
    rawText,
    ocrConfidence
  };
};
