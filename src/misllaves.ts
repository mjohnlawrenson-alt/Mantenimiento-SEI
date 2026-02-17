import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <--- ¡NUEVO!

// --- TUS LLAVES DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA3NIor3T-VbUC9SfzSgYP7DxirH8leeSo",
  authDomain: "sei-europa-mantenimiento.firebaseapp.com",
  projectId: "sei-europa-mantenimiento",
  storageBucket: "sei-europa-mantenimiento.firebasestorage.app",
  messagingSenderId: "1001646514383",
  appId: "1:1001646514383:web:c697e9cf7881dcfc5e17ba"
};

// --- INICIALIZACIÓN ---
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); // <--- ¡NUEVO! (Esto faltaba)
