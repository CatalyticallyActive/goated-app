import { useEffect, useRef, useState } from 'react';

export function useScreenCapture(stream: MediaStream | null, intervalMs = 10000) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!stream) {
      console.log('No stream provided to useScreenCapture');
      return;
    }
    
    console.log('Setting up screen capture with stream:', stream);
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;
    video.play();

    const capture = () => {
      if (!video.videoWidth || !video.videoHeight) {
        console.log('Video not ready yet, skipping capture');
        return;
      }
      console.log('Capturing screenshot...');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const screenshotData = canvas.toDataURL('image/png');
        console.log('Screenshot captured, size:', canvas.width, 'x', canvas.height, 'data length:', screenshotData.length);
        setScreenshot(screenshotData);
      } else {
        console.error('Failed to get canvas context');
      }
    };

    intervalRef.current = setInterval(capture, intervalMs);
    console.log('Screen capture interval set to:', intervalMs, 'ms');
    // Capture immediately on start
    video.onloadeddata = () => {
      console.log('Video loaded, capturing initial screenshot');
      capture();
    };

    return () => {
      console.log('Cleaning up screen capture');
      if (intervalRef.current) clearInterval(intervalRef.current);
      video.pause();
      video.srcObject = null;
      videoRef.current = null;
    };
  }, [stream, intervalMs]);

  return screenshot;
} 