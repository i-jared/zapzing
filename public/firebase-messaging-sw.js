importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyDI7aSIqRBRW78MSLxCuu_EpOLuY3XgctI",
  authDomain: "zappzingg.firebaseapp.com",
  projectId: "zappzingg",
  storageBucket: "zappzingg.firebasestorage.app",
  messagingSenderId: "184092012159",
  appId: "1:184092012159:web:f0c09adc2711873a10194a",
  measurementId: "G-GY8EC82RL8",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/assets/logo_light.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
