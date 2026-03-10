import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdpSng4jQL0BqpShqNL4BfaczKbEmdyto",
  authDomain: "puhu-smallgroup.firebaseapp.com",
  projectId: "puhu-smallgroup",
  storageBucket: "puhu-smallgroup.firebasestorage.app",
  messagingSenderId: "1090768106929",
  appId: "1:1090768106929:web:ea1c34688f35b07b5a3990",
  measurementId: "G-LPE9Y8E0Z2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
