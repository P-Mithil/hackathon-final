
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// Make sure these values are correct and directly from your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyAFIQ_-7cl0PfmIHIZ7t-uH8joEsf41nBU",
  authDomain: "agrivision-dashboard-baubn.firebaseapp.com",
  projectId: "agrivision-dashboard-baubn",
  storageBucket: "agrivision-dashboard-baubn.firebasestorage.app", // Corrected based on user's image
  messagingSenderId: "1095425003606",
  appId: "1:1095425003606:web:f2deedb52513eacb7e2bf7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, storage };
