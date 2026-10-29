// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD28_Rsdes6M89odLKMqQkQXiS0KjZQlQI",
  authDomain: "hapzo360.firebaseapp.com",
  projectId: "hapzo360",
  storageBucket: "hapzo360.firebasestorage.app",
  messagingSenderId: "586874480717",
  appId: "1:586874480717:web:fcc5e1aed215682cdd1404"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);