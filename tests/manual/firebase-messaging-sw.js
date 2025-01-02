importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD9jH_pt-1MBFOPtBH3ahAFMRUbG8UQiWY",
    projectId: "credex-core",
    messagingSenderId: "113652835497",
    appId: "1:113652835497:web:86eb258d79a025b72ef5b8"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
});
