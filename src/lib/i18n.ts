
'use client'; // i18next plays best with client-side initialization for Next.js App Router

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Loads translations from /public/locales
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    supportedLngs: ['en', 'es', 'te', 'hi'], // Added 'te' for Telugu and 'hi' for Hindi
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development', // Enable debug output in development
    detection: {
      // Order and from where user language should be detected
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['cookie', 'localStorage'], // Where to cache the detected language
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json', // Path to translation files
    },
    react: {
      useSuspense: false, // Set to true if you prefer to use React Suspense for loading translations
    },
  });

export default i18n;
