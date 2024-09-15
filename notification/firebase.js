const firebaseAdmin = require("firebase-admin");
require("dotenv").config();

class FirebaseService {
  static initApp() {
    const firebaseConfig = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_x509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_x509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
    };

    try {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(firebaseConfig),
      });
      console.log("Firebase app initialization was successful!");
    } catch (error) {
      console.error("Firebase app initialization failed!", error);
    }
  }
  static async sendNotification(deviceToken, title, body, data = {}) {
    const message = {
      token: deviceToken, // FCM token of the target device
      notification: {
        title: title,
        body: body,
      },
      // Comment out the data field if not needed to prevent double notifications
      // data: data, 
  
      // iOS-specific payload
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
        },
      },
  
      // Android-specific payload
      android: {
        priority: "high",
        notification: {
          title: title,
          body: body,
          sound: "default",
        },
      },
    };
  
    try {
      const response = await firebaseAdmin.messaging().send(message);
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
  


  static async sendNotificationToTopic(topic, title, body, data = {}) {
    const message = {
      topic: topic, // FCM topic

      notification: {
        title: title,
        body: body,
      },
      data: data,  // Add custom data here (optional)

      // iOS-specific payload
      apns: {
        headers: {
          'apns-priority': '10', // High priority for iOS notifications
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            sound: "default",  // Ensures sound plays on iOS
            badge: 1,  // Badge on app icon
            "content-available": 1,  // Allows background notifications
          },
        },
      },

      // Android-specific payload
      android: {
        priority: "high",  // High priority for Android notifications
        notification: {
          title: title,
          body: body,
          sound: "default",  // Play sound on Android
        },
      },
    };

    try {
      const response = await firebaseAdmin.messaging().send(message);
      console.log("Successfully sent message to topic:", response);
    } catch (error) {
      console.error("Error sending message to topic:", error);
    }
  }
}

module.exports = FirebaseService;
