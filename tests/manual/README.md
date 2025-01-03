# Manual Test Utilities

This directory contains utilities for manual testing and development.

## Generate JWT Token

`generate-token.js` - Utility for generating JWT tokens for testing

### Required Environment Variables

- `JWT_SECRET`: Secret key used for signing the JWT
- `MEMBER_ID`: UUID of the member to generate token for

### Usage

```bash
JWT_SECRET=your-secret MEMBER_ID=your-member-id node generate-token.js
```

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

1. Generate an auth token:
   ```bash
   JWT_SECRET=your-secret MEMBER_ID=your-member-id node generate-token.js
   ```

2. Run the test script with both tokens:
   ```bash
   FCM_TOKEN=your-fcm-token AUTH_TOKEN=your-auth-token node test-push-notifications.js
   ```

The script will test:
- FCM token registration
- Token validation
- Sending a test notification
