importScripts('https://www.gstatic.com/firebasejs/6.0.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/6.0.2/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.

firebase.initializeApp({messagingSenderId: "452800756750"});
var messaging = firebase.messaging();

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.

messaging.setBackgroundMessageHandler(payload => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = 'Background Message Title';
  const notificationOptions = {
    body: 'Background Message body.',
    icon: '/assets/logo.jpg'
  };

  return self.registration.showNotification(notificationTitle,
      notificationOptions);
});