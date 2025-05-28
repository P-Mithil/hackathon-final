// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFIQ_-7cl0PfmIHIZ7t-uH8joEsf41nBU",
  authDomain: "agrivision-dashboard-baubn.firebaseapp.com",
  projectId: "agrivision-dashboard-baubn",
  storageBucket: "agrivision-dashboard-baubn.firebasestorage.app", // Reverted to user's original
  messagingSenderId: "1095425003606",
  appId: "1:1095425003606:web:f2deedb52513eacb7e2bf7"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, storage };