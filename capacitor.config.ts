import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.069c975623824501b4e24ba88e9745f5',
  appName: 'محلل الأداء',
  webDir: 'dist',
  server: {
    url: 'https://dash-profit-glow.lovable.app',
    cleartext: true,
  },
  android: {
    backgroundColor: '#131720',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#131720',
      showSpinner: true,
      spinnerColor: '#10B981',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
