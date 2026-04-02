// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBA3wjbaBwBK-_e52HbKkVg51Uj22Jb20g",
  authDomain: "fonestore-7dac2.firebaseapp.com",
  projectId: "fonestore-7dac2",
  storageBucket: "fonestore-7dac2.firebasestorage.app",
  messagingSenderId: "784717102349",
  appId: "1:784717102349:web:9b9cebe1e89292904ec444",
  measurementId: "G-81GJGCDK22"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);