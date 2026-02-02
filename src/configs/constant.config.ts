// Get environment variables from window (runtime) or fallback to import.meta.env (build time for dev)
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__[key as keyof typeof window.__ENV__] || '';
  }
  return import.meta.env[key] as string || '';
};

export const constant = {
  port: +(getEnvVar('PORT') || '5173'),
  devURL: getEnvVar('VITE_DEV_APP_URL'),
  liveURL: getEnvVar('VITE_LIVE_APP_URL'),
  FLWPUBKTest: getEnvVar('VITE_FLWPUBKTEST'),
  uploadLogo: getEnvVar('VITE_UPLOAD_LOGO'),
  appURL: getEnvVar('VITE_APP_URL'),
};
