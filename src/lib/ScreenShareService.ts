// ScreenShareService.ts
// Service for handling screen/window/tab sharing using the Screen Capture API

export class ScreenShareService {
  private stream: MediaStream | null = null;

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

  // Open a pop-out window for the floating bar
  openFloatingBarWindow(url: string = '/floating-bar', width = 520, height = 120): Window | null {
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + 100;
    const features = `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`;
    const popup = window.open(url, 'GoatedAI_FloatingBar', features);
    return popup;
  }
}

// Singleton instance
export const screenShareService = new ScreenShareService(); 