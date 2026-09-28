import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Firestore 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User, 
  Auth 
} from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { OfficerProfile } from '../types/game';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp({
        apiKey: firebaseConfigJson.apiKey,
        authDomain: firebaseConfigJson.authDomain,
        projectId: firebaseConfigJson.projectId,
        storageBucket: firebaseConfigJson.storageBucket,
        messagingSenderId: firebaseConfigJson.messagingSenderId,
        appId: firebaseConfigJson.appId,
      });
    }
  }
  return app;
}

export function getDB(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    if (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)') {
      db = getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId);
    } else {
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    auth = getAuth(firebaseApp);
  }
  return auth;
}

// Authentication Helpers
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const authInstance = getFirebaseAuth();
    const result = await signInWithPopup(authInstance, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google authentication error:', error);
    throw error;
  }
}

export async function loginAnonymously(): Promise<User | null> {
  // Anonymous authentication is disabled by default in Firebase project settings
  // The app safely runs in local guest detective mode until Google Sign-In is used
  return null;
}

export async function logoutDetective(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await signOut(authInstance);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, callback);
}

// Firestore Persistence Helpers
export async function syncGameStateToCloud(userId: string, data: any): Promise<boolean> {
  try {
    const authInstance = getFirebaseAuth();
    if (!authInstance.currentUser || authInstance.currentUser.uid !== userId) {
      // Only authenticated Firebase users can write to Firestore
      return false;
    }
    const firestore = getDB();
    const userDocRef = doc(firestore, 'gameState', userId);
    await setDoc(userDocRef, {
      ...data,
      userId,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firestore cloud sync warning (falling back to local cache):', err);
    return false;
  }
}

export async function loadGameStateFromCloud(userId: string): Promise<any | null> {
  try {
    const authInstance = getFirebaseAuth();
    if (!authInstance.currentUser || authInstance.currentUser.uid !== userId) {
      return null;
    }
    const firestore = getDB();
    const userDocRef = doc(firestore, 'gameState', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Firestore load failed, using local cache:', err);
    return null;
  }
}

export function subscribeToRemoteGameState(userId: string, onUpdate: (data: any) => void) {
  try {
    const authInstance = getFirebaseAuth();
    if (!authInstance.currentUser || authInstance.currentUser.uid !== userId) {
      return () => {};
    }
    const firestore = getDB();
    const userDocRef = doc(firestore, 'gameState', userId);
    return onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data());
      }
    }, (err) => {
      console.warn('Firestore remote listener notice:', err);
    });
  } catch (e) {
    console.warn('Could not establish Firestore listener:', e);
    return () => {};
  }
}

export async function saveOfficerProfileToCloud(userId: string, profile: Partial<OfficerProfile>): Promise<void> {
  try {
    const authInstance = getFirebaseAuth();
    if (!authInstance.currentUser || authInstance.currentUser.uid !== userId) {
      return;
    }
    const firestore = getDB();
    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save officer profile to Firestore:', err);
  }
}
