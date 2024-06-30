const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');
const { admin, firestore } = require('../firebase/admin');
const { auth: firebaseAuth } = require('../firebase/client');

// Function to generate a random unique username
function generateRandomUsername() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 2,
    style: 'capital'
  });
}

// Sign-up with email and password
exports.signupWithEmail = async (req, res) => {
  const { email, password } = req.body;
  const randomUsername = generateRandomUsername();

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: randomUsername,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'user' });

    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      username: randomUsername,
      role: 'user'
    };

    await firestore.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({ message: 'User signed up successfully', user: userData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Sign-in with email and password and issue Firebase ID token
exports.signinWithEmail = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    const idToken = await userCredential.user.getIdToken(true); // Force refresh to get the latest token

    // Decode the token to check its contents
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);

    res.status(200).json({ message: 'User signed in successfully', token: idToken });
  } catch (error) {
    let errorMessage;

    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No user found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'The email address is not valid.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'The user account has been disabled by an administrator.';
        break;
      case 'auth/invalid-login-credentials':
        errorMessage = 'Invalid email or password. Please check your credentials.';
        break;
      default:
        errorMessage = 'An error occurred during sign in. Please try again.';
    }

    res.status(400).json({ error: errorMessage });
  }
};
