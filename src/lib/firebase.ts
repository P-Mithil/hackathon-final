
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
// PASTE YOUR FRESHLY COPIED firebaseConfig OBJECT FROM THE FIREBASE CONSOLE HERE
const firebaseConfig = {
  apiKey: "YOUR_FRESHLY_COPIED_API_KEY",
  authDomain: "YOUR_FRESHLY_COPIED_AUTH_DOMAIN",
  projectId: "YOUR_FRESHLY_COPIED_PROJECT_ID",
  storageBucket: "YOUR_FRESHLY_COPIED_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FRESHLY_COPIED_MESSAGING_SENDER_ID",
  appId: "YOUR_FRESHLY_COPIED_APP_ID"
  // measurementId is optional, include if present in your console's config
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, storage };
