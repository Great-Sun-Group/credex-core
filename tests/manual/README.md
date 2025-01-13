# Manual Test Utilities

This directory contains utilities for testing push notifications.

## Push Notification Testing

### Files
- `test-push-notifications.js` - Utility for testing push notifications
- `get-fcm-token.example.html` - Example web page for getting FCM tokens
- `firebase-messaging-sw.example.js` - Example service worker for FCM
- `get-fcm-token.html` - Your configured web page (gitignored)
- `firebase-messaging-sw.js` - Your configured service worker (gitignored)

### Firebase Setup
1. Get your Firebase configuration from Firebase Console:
   - Go to Project Settings (gear icon)
   - Under "General" tab, find your web app configuration
   - Under "Cloud Messaging" tab, find your Web Push certificate

2. Copy the example files:
   ```bash
   cp get-fcm-token.example.html get-fcm-token.html
   cp firebase-messaging-sw.example.js firebase-messaging-sw.js
   ```

3. Update both files with your Firebase configuration:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "your-project-id.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project-id.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

4. In get-fcm-token.html, also update the VAPID key:
   ```javascript
   vapidKey: "YOUR_VAPID_KEY" // From Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
   ```

Note: The configured files (get-fcm-token.html and firebase-messaging-sw.js) are gitignored to prevent committing sensitive credentials

### Usage
1. Start a local server in the tests/manual directory:
   ```bash
   cd tests/manual
   python3 -m http.server 8000
   ```
2. Open http://localhost:8000/get-fcm-token.html in your browser
3. Follow the on-screen instructions to get your FCM token

### Testing Push Notifications
After getting your FCM token:

1. Get a valid auth token by logging into the application
   - Note: Do not use generate-token.js as manually generated tokens will not work
   - The server expects specific embedded information in the token that only comes from the actual login process

2. Run the test script with both tokens:
   ```bash
   FCM_TOKEN=your-fcm-token AUTH_TOKEN=your-auth-token node test-push-notifications.js
   ```

You should see output indicating successful tests:
```
Starting Push Notification Integration Tests

1. Testing FCM Token Registration
✓ Token registration successful

2. Testing FCM Token Validation
✓ Token validation successful

3. Testing Send Notification
✓ Test notification sent successfully

Tests completed
```

A test notification should appear in your browser if everything is working correctly.

The script will test:
- FCM token registration
- Token validation
- Sending a test notification
