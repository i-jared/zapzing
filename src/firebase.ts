// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken } from "firebase/messaging";
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
  measurementId: "G-GY8EC82RL8",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Add additional Firebase service exports here as needed
// Example: export const auth = getAuth(app);

// Function to get FCM token
export const getFCMToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey:
        "BNcXVRPxth0clkG7PrjWQn9iA_7PR-E-JecG8qtoYM304UkZ2-9rGM7omIlxWPXP8dU1yezMg7uBf_sLE5F_Hz0", // You need to add your VAPID key here
    });
    if (currentToken) {
      return currentToken;
    } else {
      console.log(
        "No registration token available. Request permission to generate one."
      );
      return null;
    }
  } catch (err) {
    console.log("An error occurred while retrieving token. ", err);
    return null;
  }
};
