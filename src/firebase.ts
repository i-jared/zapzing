// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDI7aSIqRBRW78MSLxCuu_EpOLuY3XgctI",
  authDomain: "zappzingg.firebaseapp.com",
  projectId: "zappzingg",
  storageBucket: "zappzingg.firebasestorage.app",
  messagingSenderId: "184092012159",
  appId: "1:184092012159:web:f0c09adc2711873a10194a",
  measurementId: "G-GY8EC82RL8"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Add additional Firebase service exports here as needed
// Example: export const auth = getAuth(app); 