const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');
const firebase = require('../firebase/client');
const firestore = firebase.firestore(); // Assuming you are using Firestore

// Function to generate a random unique username
function generateRandomUsername() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 2,
    style: 'capital'
  });
}

// Sign-up with email and password
exports.signupWithEmail = (req, res) => {
  const { email, password } = req.body;
  const randomUsername = generateRandomUsername(); // Generate random username

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      // Update user profile with random username
      return userCredential.user.updateProfile({
        displayName: randomUsername
      }).then(() => {
        // Store additional user data including username in Firestore
        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: randomUsername // Store username here
        };

        // Store user data in Firestore
        return firestore.collection('users').doc(userCredential.user.uid).set(userData)
          .then(() => {
            res.status(201).json({ message: 'User signed up successfully', user: userData });
          })
          .catch(error => {
            res.status(500).json({ error: 'Error storing user data in Firestore', details: error });
          });
      });
    })
    .catch(error => {
      res.status(400).json({ error: error.message });
    });
};

  
  // Sign-in with email and password
exports.signinWithEmail = (req, res) => {
  const { email, password } = req.body;
  
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified,
        username: userCredential.user.displayName,
       // photoURL: userCredential.user.photoURL
        // Add other necessary fields as needed
      };
      res.status(200).json({ message: 'User signed in successfully', user });
    })
    .catch(error => {
      res.status(400).json({ error: error.message });
    });
};

// Sign-in with Google
// exports.signinWithGoogle = (req, res) => {
//     const { idToken } = req.body;
//     const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
  
//     firebase.auth().signInWithCredential(credential)
//       .then(userCredential => {
//         const user = {
//           uid: userCredential.user.uid,
//           email: userCredential.user.email,
//           emailVerified: userCredential.user.emailVerified,
//           displayName: userCredential.user.displayName,
//           photoURL: userCredential.user.photoURL
//           // Add other necessary fields as needed
//         };
//         res.status(200).json({ message: 'User signed in with Google successfully', user });
//       })
//       .catch(error => {
//         res.status(400).json({ error: error.message });
//       });
//   };
  
  // Sign-in with Apple
  // exports.signinWithApple = (req, res) => {
  //   const { idToken } = req.body;
  //   const credential = firebase.auth.OAuthProvider('apple.com').credential(idToken);
  
  //   firebase.auth().signInWithCredential(credential)
  //     .then(userCredential => {
  //       const user = {
  //         uid: userCredential.user.uid,
  //         email: userCredential.user.email,
  //         emailVerified: userCredential.user.emailVerified
  //         // Add other necessary fields as needed
  //       };
  //       res.status(200).json({ message: 'User signed in with Apple successfully', user });
  //     })
  //     .catch(error => {
  //       res.status(400).json({ error: error.message });
  //     });
  // };
  