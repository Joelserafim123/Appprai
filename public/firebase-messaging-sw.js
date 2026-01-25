// This file must be in the public folder.

// These versions should be aligned with the `firebase` package version.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This config is duplicated from src/firebase/config.ts
// A backend endpoint to serve this would be a better long-term solution
// if the config changes frequently.
const firebaseConfig = {
  "projectId": "cadastro-3c63f",
  "appId": "1:344820186473:web:68edb8061af3e0159211f8",
  "apiKey": "AIzaSyD3I4LHBJbHD-Gqtc2HjhAoS-6gs6yI0HI",
  "authDomain": "cadastro-3c63f-e1d52.firebaseapp.com",
  "storageBucket": "cadastro-3c63f.appspot.com",
  "measurementId": "",
  "messagingSenderId": "344820186473"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Optional: Handle background messages here.
// When a notification is received while the app is in the background, this
// function will be triggered.
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );

  // Customize the notification that is shown to the user.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico', // You can use your app's icon here.
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
