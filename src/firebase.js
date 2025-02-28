import { initializeApp } from 'firebase/app';
import { collection, getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Initialize Firebase configuration!
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase!
const app = initializeApp(firebaseConfig);

// Initialize Firestore!
export const db = getFirestore(app);
export const colRef = collection(db, 'gdocs');

// Initialize Auth!
export const provider = new GoogleAuthProvider();
export const auth = getAuth(app);
