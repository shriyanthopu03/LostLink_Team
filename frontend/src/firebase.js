import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYIeG5JW8dAx8UtnlcqKbCsEMvkeMKGyM",
  authDomain: "atp-hack.firebaseapp.com",
  projectId: "atp-hack",
  storageBucket: "atp-hack.firebasestorage.app",
  messagingSenderId: "717838825655",
  appId: "1:717838825655:web:185c9606d64816f329b532",
  measurementId: "G-7EVHLMMYC4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Safely initialize Analytics if supported in environment
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, analytics, auth, googleProvider, signInWithPopup };
