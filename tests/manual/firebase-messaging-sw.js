importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD9jH_pt-1MBFOPtBH3ahAFMRUbG8UQiWY",
    authDomain: "credex-core.firebaseapp.com",
    projectId: "credex-core",
    storageBucket: "credex-core.appspot.com",
    messagingSenderId: "113652835497",
    appId: "1:113652835497:web:d4bb98e1808e33b82ef5b8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance and set up background handler
const messaging = firebase.messaging();

// Optional: Add logging to debug service worker initialization
console.log('Firebase messaging service worker initialized');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
});
