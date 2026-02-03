import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDxP7WIbX23PGYCUT-xiISHNSH_sYJ8mqE",
    authDomain: "edusmart-e252a.firebaseapp.com",
    projectId: "edusmart-e252a",
    storageBucket: "edusmart-e252a.firebasestorage.app",
    messagingSenderId: "626886478633",
    appId: "1:626886478633:web:9eaf70b08666e64f7dc538",
    measurementId: "G-06V02EYK1K"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
