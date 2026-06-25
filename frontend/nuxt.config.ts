// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Modifying the pattern changes the generated hash/name structure
          chunkFileNames: '_nuxt/[name].[hash].js',
          entryFileNames: '_nuxt/[name].[hash].js',
        }
      }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8080',
      firebaseApiKey: process.env.FIREBASE_API_KEY || 'mock-api-key',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || 'mock-auth-domain',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'rebideo-dev',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'mock-storage-bucket',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'mock-sender-id',
      firebaseAppId: process.env.FIREBASE_APP_ID || 'mock-app-id'
    }
  }
})
