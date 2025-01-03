# Push Notifications Testing Guide

This guide helps you test the integration between your client application and the push notification service.

## Prerequisites

1. Firebase project set up with proper credentials in .env
2. Server running with Firebase configuration
3. Client app with Firebase Cloud Messaging SDK installed

## Testing Steps

### 1. Get FCM Token

1. Go to the Firebase Console (https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Add a web app to your project:
   - Click "Add app" and select web (</>)
   - Register app with a nickname
   - Copy the firebaseConfig object containing:
     - apiKey
     - projectId
     - messagingSenderId
     - appId

4. Get your Web Push certificate:
   - In Firebase Console, go to Project Settings
   - Under "Cloud Messaging" tab
   - Find "Web Push certificates"
   - Generate a new key pair if none exists
   - Copy the "Key pair" value (this is your VAPID key)

5. Set up the test files:
   ```bash
   cd tests/manual
   cp get-fcm-token.example.html get-fcm-token.html
   cp firebase-messaging-sw.example.js firebase-messaging-sw.js
   ```

6. Update both files with your Firebase configuration:
   - In both files, replace the firebaseConfig values with your copied configuration
   - In get-fcm-token.html, also update the vapidKey with your Web Push certificate

7. Start a local server:
   ```bash
   cd tests/manual
   python3 -m http.server 8000
   ```

8. Open http://localhost:8000/get-fcm-token.html in your browser

9. Click "Request Permission & Get Token"

10. Copy the generated FCM token

Note: You'll need to enable notifications in your browser and accept the permission request to receive the token.

### 2. Testing Endpoints

Use the provided test script to verify the integration:

1. Install dependencies:
```bash
cd tests/manual
npm install axios
```

2. Update test configuration in test-push-notifications.js:
```javascript
const testFcmToken = 'YOUR_FCM_TOKEN'; // Replace with token from get-fcm-token.html
```

3. Run the test script:
```bash
node test-push-notifications.js
```

The script will test:
- Token registration
- Token validation
- Test notification sending

### 3. Manual Testing

#### Test Token Registration

```bash
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "YOUR_FCM_TOKEN",
    "platform": "android"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Token registered successfully"
}
```

#### Test Token Validation

```bash
curl -X POST http://localhost:3000/api/notifications/validate-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "token": "YOUR_FCM_TOKEN"
  }'
```

Expected response:
```json
{
  "success": true,
  "isValid": true,
  "message": "Token is valid"
}
```

#### Test Notification Sending

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

### 4. Verification

1. Check client app for notification reception
2. Verify notification content matches sent data
3. Check server logs for:
   - Token registration success
   - Token validation results
   - Notification delivery status

### 5. Troubleshooting

Common issues and solutions:

1. Token Registration Fails
   - Verify Firebase configuration in client app
   - Check authentication token in request
   - Verify network connectivity

2. Notification Not Received
   - Check device notification permissions
   - Verify FCM token is valid
   - Check server logs for delivery errors

3. Invalid Token
   - Re-generate FCM token
   - Update token registration
   - Check Firebase project configuration

## Next Steps

After successful testing:

1. Implement token refresh handling
2. Add error recovery mechanisms
3. Set up production monitoring
4. Implement notification analytics

For any issues, check the server logs and Firebase Console for detailed error messages.
