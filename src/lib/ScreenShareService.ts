// ScreenShareService.ts
// Service for handling screen/window/tab sharing using the Screen Capture API

export class ScreenShareService {
  private stream: MediaStream | null = null;
  private pipWindow: Window | null = null;

  // Start screen sharing, prompt user to select a window/tab/screen
  async startCapture(): Promise<MediaStream | null> {
    if (this.stream) {
      return this.stream;
    }
    try {
      // Use the most permissive options for maximum compatibility
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      return this.stream;
    } catch (err) {
      console.error('Screen sharing failed:', err);
      this.stream = null;
      return null;
    }
  }

  // Stop screen sharing
  stopCapture() {
    if (this.stream) {
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
        console.warn('Document Picture-in-Picture API not supported, falling back to regular popup');
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
      return pipWindow;
    } catch (err) {
      console.error('Failed to open Picture-in-Picture window:', err);
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
    return popup;
  }

  // Close the PiP window
  closePiPWindow() {
    if (this.pipWindow && !this.pipWindow.closed) {
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