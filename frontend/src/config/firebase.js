// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3kMpXBKbTOek2IL1mbXVmWiqblKUg5Qk",
  authDomain: "hapzo360-92476.firebaseapp.com",
  projectId: "hapzo360-92476",
  storageBucket: "hapzo360-92476.firebasestorage.app",
  messagingSenderId: "711716567203",
  appId: "1:711716567203:web:4f14e7e9e29011cb77e716"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);