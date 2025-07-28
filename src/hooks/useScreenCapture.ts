import { useEffect, useRef, useState } from 'react';
import { debug } from '@/lib/utils';

export function useScreenCapture(stream: MediaStream | null, intervalMs = 10000) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to clean up resources
  const cleanup = () => {
    debug.log('Cleaning up screen capture');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  };

  useEffect(() => {
    if (!stream) {
      cleanup();
      return;
    }
    
    debug.log('Setting up screen capture with stream:', stream);
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    videoRef.current = video;
    video.play();

    const capture = () => {
      // Check if any tracks are stopped
      if (stream.getTracks().some(track => !track.enabled || track.readyState === 'ended')) {
        debug.log('Stream tracks stopped, cleaning up capture');
        cleanup();
        return;
      }

      if (!video.videoWidth || !video.videoHeight) {
        debug.log('Video not ready yet, skipping capture');
        return;
      }
      debug.log('Capturing screenshot...');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const screenshotData = canvas.toDataURL('image/png');
        debug.log('Screenshot captured, dimensions:', canvas.width, 'x', canvas.height);
        setScreenshot(screenshotData);
      } else {
        debug.error('Failed to get canvas context');
      }
    };

    // Add track ended event listeners
    const handleTrackEnded = () => {
      debug.log('Track ended, cleaning up capture');
      cleanup();
    };
    
    stream.getTracks().forEach(track => {
      track.addEventListener('ended', handleTrackEnded);
    });

    intervalRef.current = setInterval(capture, intervalMs);
    debug.log('Screen capture interval set to:', intervalMs, 'ms');
    
    // Capture immediately on start
    video.onloadeddata = () => {
      debug.log('Video loaded, capturing initial screenshot');
      capture();
    };

    return () => {
      // Remove track event listeners
      stream.getTracks().forEach(track => {
        track.removeEventListener('ended', handleTrackEnded);
      });
      cleanup();
    };
  }, [stream, intervalMs]);

  return screenshot;
} 