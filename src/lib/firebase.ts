import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzg-nGdw-9vhk6Oo9SEBYUYM1ov6mgCrQ",
  authDomain: "gen-lang-client-0419195254.firebaseapp.com",
  projectId: "gen-lang-client-0419195254",
  storageBucket: "gen-lang-client-0419195254.firebasestorage.app",
  messagingSenderId: "174818806663",
  appId: "1:174818806663:web:7fb6d280b696a709c56122"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
