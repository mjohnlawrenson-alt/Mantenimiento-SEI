import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- TUS LLAVES DE FIREBASE ---
// Copia los valores de tu consola de Firebase y ponlos aquí dentro de las comillas.

const firebaseConfig = {
  apiKey: "AIzaSyA3NIor3T-VbUC9SfzSgYP7DxirH8leeSo",
  authDomain: "sei-europa-mantenimiento.firebaseapp.com",
  projectId: "sei-europa-mantenimiento",
  storageBucket: "sei-europa-mantenimiento.firebasestorage.app", 
  messagingSenderId: "1001646514383",
  appId: "1:1001646514383:web:c697e9cf7881dcfc5e17ba"
};

// --- INICIALIZACIÓN (NO TOCAR) ---
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
