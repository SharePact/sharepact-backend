const admin = require('firebase-admin');

// Load environment variables
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!serviceAccountBase64 || !storageBucket) {
  console.error('ERROR: Required environment variables are not set.');
  process.exit(1);
}

// Decode the base64-encoded service account JSON
const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');

try {
  // Parse the JSON string to a JavaScript object
  const serviceAccount = JSON.parse(serviceAccountJson);

  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucket,
  });

  const firestore = admin.firestore();
  const storage = admin.storage().bucket(storageBucket); // Initialize with specified bucket

  module.exports = { admin, firestore, storage };
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1); // Exit the process with an error code
}
