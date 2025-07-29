// ScreenShareService.ts
// Service for handling screen/window/tab sharing using the Screen Capture API

import { debug } from '@/lib/utils';

export class ScreenShareService {
  private stream: MediaStream | null = null;
  private pipWindow: Window | null = null;

  // Start screen sharing, prompt user to select a window/tab/screen
  async startCapture(): Promise<MediaStream | null> {
    if (this.stream) {
      return this.stream;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Store the stream
      this.stream = stream;

      // Add track ended listener to clean up
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          debug.log('Screen sharing track ended');
          this.stopCapture();
        });
      });

      debug.log('Screen sharing started successfully');
      return stream;
    } catch (err) {
      debug.error('Screen sharing failed:', err);
      return null;
    }
  }

  // Stop screen sharing
  stopCapture() {
    if (this.stream) {
      debug.log('Stopping screen sharing');
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  // Get the current stream
  getStream(): MediaStream | null {
    return this.stream;
  }

  // Open floating bar in Picture-in-Picture mode
  async openFloatingBarPiP(): Promise<Window | null> {
    try {
      // Check if Document Picture-in-Picture API is supported
      if (!('documentPictureInPicture' in window)) {
        debug.warn('Document Picture-in-Picture API not supported, falling back to regular popup');
        return this.openFloatingBarWindow();
      }

      // Request Picture-in-Picture
      const pipWindow = await window.documentPictureInPicture!.requestWindow({
        width: 520,
        height: 120,
        initialAspectRatio: 520 / 120,
      });

      // Navigate the PiP window to the floating bar route
      pipWindow.location.href = '/floating-bar';
      
      this.pipWindow = pipWindow;

      // Add close listener to clean up
      pipWindow.addEventListener('unload', () => {
        debug.log('PiP window closed');
        this.pipWindow = null;
      });

      return pipWindow;
    } catch (err) {
      debug.error('Failed to open Picture-in-Picture window:', err);
      // Fallback to regular popup
      return this.openFloatingBarWindow();
    }
  }

  // Open a pop-out window for the floating bar (fallback)
  openFloatingBarWindow(url: string = '/floating-bar', width = 520, height = 120): Window | null {
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + 100;
    const features = `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`;
    const popup = window.open(url, 'GoatedAI_FloatingBar', features);
    
    if (popup) {
      this.pipWindow = popup;
      // Add close listener
      popup.addEventListener('unload', () => {
        debug.log('Floating bar window closed');
        this.pipWindow = null;
      });
    }
    
    return popup;
  }

  // Close the PiP window
  closePiPWindow() {
    if (this.pipWindow && !this.pipWindow.closed) {
      debug.log('Closing PiP/floating bar window');
      this.pipWindow.close();
      this.pipWindow = null;
    }
  }

  // Get the current PiP window
  getPiPWindow(): Window | null {
    return this.pipWindow;
  }
}

// Singleton instance
export const screenShareService = new ScreenShareService(); 