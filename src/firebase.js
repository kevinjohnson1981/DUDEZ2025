import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "B5JFG4KI6LA3MYOKEGJM6QRHXE",
  authDomain: "dudezweekend.firebaseapp.com",
  projectId: "dudezweekend",
  storageBucket: "dudezweekend.firebasestorage.app",
  messagingSenderId: "457009282290",
  appId: "1:457009282290:web:a9d45ff5a8f2a62c83a46b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };