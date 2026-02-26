// ============================================================
// OpenArg — Firebase Admin Client (Singleton)
// ============================================================

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let db: Firestore | undefined;

/**
 * Get or initialize the Firebase Admin app and Firestore instance.
 * Uses GOOGLE_APPLICATION_CREDENTIALS env var for local dev,
 * or individual env vars for production (Vercel).
 */
export function getFirestoreDB(): Firestore {
    if (db) return db;

    if (getApps().length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID;

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Local dev: use service account key file
            app = initializeApp({
                credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
                projectId,
            });
        } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            // Production (Vercel): use individual env vars
            app = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
                projectId,
            });
        } else {
            throw new Error(
                '[Firebase] Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS (local) or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (production).'
            );
        }

        console.log(`[Firebase] Initialized for project: ${projectId}`);
    } else {
        app = getApps()[0];
    }

    db = getFirestore(app);
    return db;
}
