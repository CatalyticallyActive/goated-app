/// <reference types="vite/client" />

// Document Picture-in-Picture API declarations
interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number;
    height?: number;
    initialAspectRatio?: number;
  }): Promise<Window>;
  window: Window | null;
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
