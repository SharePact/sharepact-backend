const admin = require('firebase-admin');

// Load environment variables
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!serviceAccount || !storageBucket) {
  console.error('ERROR: Required environment variables are not set.');
  process.exit(1);
}

// Decode the base64-encoded service account JSON
// const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');


  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert({clientEmail:process.env.FIREBASE_CLIENT_EMAIL, projectId: process.env.FIREBASE_PROJECT_ID , privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/gm,"\n") }),
    storageBucket: storageBucket,
  });

  const firestore = admin.firestore();
  const storage = admin.storage().bucket(storageBucket); // Initialize with specified bucket

  module.exports = { admin, firestore, storage };

