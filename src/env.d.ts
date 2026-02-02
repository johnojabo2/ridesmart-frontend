/// <reference types="vite/client" />

interface Window {
  __ENV__?: {
    NODE_ENV?: string;
    PORT?: string;
    VITE_DEV_APP_URL?: string;
    VITE_LIVE_APP_URL?: string;
    VITE_FLWPUBKTEST?: string;
    VITE_UPLOAD_LOGO?: string;
    VITE_APP_URL?: string;
  };
}
