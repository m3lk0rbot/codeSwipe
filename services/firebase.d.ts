// This module declaration tells TypeScript that 'firebase/app' exists
// and what it exports, providing types for the functions used.
declare module 'firebase/app' {
  export interface FirebaseOptions {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
  }
  
  export interface FirebaseApp {}

  export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
}

// Module declaration for 'firebase/auth'
declare module 'firebase/auth' {
  import { FirebaseApp } from 'firebase/app';

  // Define interfaces for the types used from the auth module
  export interface Auth {
    currentUser: User | null;
  }
  export interface AuthProvider {}

  // The User type with properties used in the app
  export interface User {
    readonly uid: string;
    readonly email: string | null;
    readonly displayName: string | null;
    readonly photoURL: string | null;
    readonly emailVerified: boolean;
    readonly metadata: {
        creationTime?: string;
    };
  }
  
  export interface UserCredential {
      readonly user: User;
  }

  // Define Persistence types for setPersistence
  export interface Persistence {}
  export const inMemoryPersistence: Persistence;
  export const browserLocalPersistence: Persistence;

  // Declare the functions used in the app
  export function getAuth(app?: FirebaseApp): Auth;
  export class GoogleAuthProvider implements AuthProvider {}
  export function signInWithPopup(auth: Auth, provider: AuthProvider): Promise<UserCredential>;
  export function setPersistence(auth: Auth, persistence: Persistence): Promise<void>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, nextOrObserver: (user: User | null) => void): () => void;
}

// Module declaration for 'firebase/firestore'
declare module 'firebase/firestore' {
    import { FirebaseApp } from 'firebase/app';

    export interface Firestore {}
    export interface DocumentData { [field: string]: any; }
    export interface DocumentReference {
        readonly id: string;
    }
    export interface CollectionReference {}
    export interface Query {}
    export interface QueryConstraint {}
    export interface DocumentSnapshot {
        readonly id: string;
        exists(): boolean;
        data(): DocumentData | undefined;
    }
    export interface QuerySnapshot {
        readonly empty: boolean;
        readonly size: number;
        readonly docs: DocumentSnapshot[];
        forEach(callback: (result: DocumentSnapshot) => void, thisArg?: any): void;
    }
    export interface Unsubscribe { (): void; }
    export interface Timestamp { toDate(): Date; }
    export interface FieldValue {}

    export function getFirestore(app?: FirebaseApp): Firestore;
    export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference;
    export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
    export function doc(reference: CollectionReference, path?: string, ...pathSegments: string[]): DocumentReference;
    export function doc(reference: DocumentReference, path: string, ...pathSegments: string[]): DocumentReference;
    export function getDoc(reference: DocumentReference): Promise<DocumentSnapshot>;
    export function getDocs(query: Query): Promise<QuerySnapshot>;
    export function addDoc(reference: CollectionReference, data: object): Promise<DocumentReference>;
    export function setDoc(reference: DocumentReference, data: object, options?: object): Promise<void>;
    export function deleteDoc(reference: DocumentReference): Promise<void>;
    export function query(query: Query, ...queryConstraints: QueryConstraint[]): Query;
    export function where(fieldPath: string, opStr: string, value: any): QueryConstraint;
    export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): QueryConstraint;
    export function limit(limit: number): QueryConstraint;
    export function serverTimestamp(): FieldValue;
}
