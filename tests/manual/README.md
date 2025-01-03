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
- `get-fcm-token.html` - Web page for getting FCM tokens
- `get-fcm-token.js` - Client-side script for FCM token retrieval
- `firebase-messaging-sw.js` - Service worker for FCM
- `firebase-config.example.js` - Example Firebase configuration file

### Firebase Setup
1. Copy `firebase-config.example.js` to `firebase-config.js`
2. Update `firebase-config.js` with your Firebase project credentials:
   ```javascript
   window.firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       projectId: "YOUR_PROJECT_ID",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```
   Note: `firebase-config.js` is gitignored to prevent committing sensitive credentials

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
