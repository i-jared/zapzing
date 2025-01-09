import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";
import { onBackgroundMessage } from "firebase/messaging/sw";

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseApp = initializeApp({
  apiKey: "AIzaSyDI7aSIqRBRW78MSLxCuu_EpOLuY3XgctI",
  authDomain: "zappzingg.firebaseapp.com",
  projectId: "zappzingg",
  storageBucket: "zappzingg.firebasestorage.app",
  messagingSenderId: "184092012159",
  appId: "1:184092012159:web:f0c09adc2711873a10194a",
  measurementId: "G-GY8EC82RL8",
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.

const messaging = getMessaging();
onBackgroundMessage(messaging, (payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title || "Zapzing!";
  const notificationOptions = {
    body: payload.notification.body || "New message",
    icon: "/assets/favicon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
