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
      console.log("initializing firebase app was successful!!!");
    } catch (error) {
      console.error("initializing firebase app failed!!!");
    }
  }

  static async sendNotification(deviceToken, title, body) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: deviceToken, // FCM token of the target device
    };

    try {
      const response = await firebaseAdmin.messaging().send(message);
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  static async sendNotificationToTopic(topic, title, body) {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      topic: topic,
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
