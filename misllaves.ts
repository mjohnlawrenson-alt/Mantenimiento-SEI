// 
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA3NIor3T-VbUC9SfzSgYP7DxirH8leeSo",
  authDomain: "sei-europa-mantenimiento.firebaseapp.com",
  projectId: "sei-europa-mantenimiento",
  storageBucket: "sei-europa-mantenimiento.firebasestorage.app",
  messagingSenderId: "1001646514383",
  appId: "1:1001646514383:web:c697e9cf7881dcfc5e17ba",
  measurementId: "G-5EHHWX4MQR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
