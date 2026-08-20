/**
 * firebase.js
 * Firebase 앱 초기화 및 Firestore/Auth 모듈 연동
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot, 
    collection, 
    setLogLevel, 
    updateDoc, 
    getDoc, 
    serverTimestamp, 
    deleteDoc, 
    writeBatch, 
    deleteField, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const productionConfig = {
    apiKey: "AIzaSyDHDao8IpUtUPISOLtEv9OoPuLW8Ns7ztA",
    authDomain: "evaluation-468b4.firebaseapp.com",
    projectId: "evaluation-468b4",
    storageBucket: "evaluation-468b4.appspot.com",
    messagingSenderId: "1067413771670",
    appId: "1:1067413771670:web:48d16f8f17ec14a0baf9b7",
    measurementId: "G-8PPK4XEJCZ"
};

const firebaseConfig = typeof window.__firebase_config !== 'undefined' 
    ? JSON.parse(window.__firebase_config) 
    : productionConfig;

export const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-innovation-eval-app';

let db = null;
let auth = null;
let firebaseInitPromise = null;

export function initializeFirebaseOnce() {
    if (firebaseInitPromise) {
        return firebaseInitPromise;
    }
    firebaseInitPromise = new Promise(async (resolve, reject) => {
        try {
            const app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            setLogLevel('error');
            
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                unsubscribe();
                if (user) {
                    resolve({ db, auth });
                } else {
                    try {
                        if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
                            await signInWithCustomToken(auth, window.__initial_auth_token);
                        } else {
                            await signInAnonymously(auth);
                        }
                        resolve({ db, auth });
                    } catch (error) {
                        console.error("Firebase Sign-in failed:", error);
                        reject(error);
                    }
                }
            });
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            reject(error);
        }
    });
    return firebaseInitPromise;
}

export function getDb() {
    return db;
}

export function getAuthInstance() {
    return auth;
}

export {
    doc,
    setDoc,
    onSnapshot,
    collection,
    updateDoc,
    getDoc,
    serverTimestamp,
    deleteDoc,
    writeBatch,
    deleteField,
    getDocs
};
