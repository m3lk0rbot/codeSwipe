import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where, limit } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { Difficulty, ProgrammingLanguage } from '../types';

const firebaseConfig = {
  apiKey: "your Google API Key",
  authDomain: "codeswipe-9ea2d.firebaseapp.com",
  projectId: "codeswipe-9ea2d",
  storageBucket: "codeswipe-9ea2d.firebasestorage.app",
  messagingSenderId: "305149132359",
  appId: "1:305149132359:web:101dcbbca9831d59083b62",
  measurementId: "G-VRZVEESJS0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Remember logged-in users across reloads
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

const provider = new GoogleAuthProvider();

export type User = FirebaseUser;

async function ensureUserDocument(user: FirebaseUser): Promise<void> {
  const userRef = doc(db, 'Users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      user_id: user.uid,
      username: user.displayName || '',
      email: user.email || '',
      password_hash: null,
      profile_pic: user.photoURL || '',
      created_at: serverTimestamp(),
      is_verified: !!user.emailVerified,
    });
  }
}

export const signInWithGoogle = async () => {
  const credential = await signInWithPopup(auth, provider);
  await ensureUserDocument(credential.user);
  return credential;
};

// Settings API
export type UserSettings = {
  level: Difficulty;
  languages: ProgrammingLanguage[];
  topics: string[];
  notifications?: boolean;
  darkMode?: boolean;
  autoSave?: boolean;
  created_at?: any;
};

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  // First, check if user already has settings
  const settingsQuery = collection(db, 'Settings');
  const q = query(settingsQuery, where('user_id', '==', userId), limit(1));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    // Update existing settings
    const existingDoc = snapshot.docs[0];
    await setDoc(doc(db, 'Settings', existingDoc.id), {
      set_id: existingDoc.id,
      user_id: userId,
      level: settings.level,
      languages: settings.languages,
      topics: settings.topics,
      updated_at: serverTimestamp(),
      created_at: existingDoc.data().created_at, // Keep original created_at
    });
  } else {
    // Create new settings
    const settingsRef = doc(collection(db, 'Settings'));
    await setDoc(settingsRef, {
      set_id: settingsRef.id,
      user_id: userId,
      level: settings.level,
      languages: settings.languages,
      topics: settings.topics,
      created_at: serverTimestamp(),
    });
  }
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const settingsQuery = collection(db, 'Settings');
  const q = query(settingsQuery, where('user_id', '==', userId), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0].data();
  return {
    level: docData.level as Difficulty || 'Intermediate',
    languages: (docData.languages as ProgrammingLanguage[]) || [],
    topics: docData.topics || [],
    notifications: docData.notifications,
    darkMode: docData.darkMode,
    autoSave: docData.autoSave,
  };
}

export const logOut = () => {
  return signOut(auth);
};

// Alias for consistency
export const updateUserSettings = saveUserSettings;

// Re-exporting the original functions so other modules can use them.
export { onAuthStateChanged, signOut };
