const admin = require('firebase-admin');
require('dotenv').config({ path: '../../.env' });

// Initialize Firebase Admin with credentials from env
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

async function getTestToken() {
  try {
    // Generate a test FCM registration token
    const message = {
      data: {
        test: 'test'
      },
      topic: 'test' // Using topic instead of token for registration
    };
    
    const testToken = await admin.messaging().getToken(message);

    console.log('\nTest FCM Token Generated:');
    console.log('----------------------------------------');
    console.log(testToken);
    console.log('----------------------------------------');
    console.log('\nUse this token in test-push-notifications.js:');
    console.log('const testFcmToken = \'' + testToken + '\';\n');
  } catch (error) {
    console.error('Error generating test token:', error);
  } finally {
    admin.app().delete();
  }
}

getTestToken();
