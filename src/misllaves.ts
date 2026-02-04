// @ts-nocheck
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3NIor3T-VbUC9SfzSgYP7DxirH8leeSo", 
  authDomain: "sei-europa-mantenimiento.firebaseapp.com",
  projectId: "sei-europa-mantenimiento",
  storageBucket: "sei-europa-mantenimiento.appspot.com",
  messagingSenderId: "931985332296", 
  appId: "1:931985332296:web:60037592440938228105e4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
