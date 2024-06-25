const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Ensure the path is correct

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const firestore = admin.firestore();
const setCustomClaims = async (uid) => {
    try {
      const userDoc = await firestore.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        console.error('No user found');
        return;
      }
  
      const userData = userDoc.data();
      const role = userData.role || 'user';
  
      // Set custom user claims
      await admin.auth().setCustomUserClaims(uid, { role });
  
      console.log(`Custom claims set for user ${uid} with role ${role}`);
    } catch (error) {
      console.error('Error setting custom claims:', error);
    }
  };
// Replace 'USER_UID' with the actual user UID
setCustomClaims('HhWYXLicd5VqMj6JbxJgiE3Kshv2');
