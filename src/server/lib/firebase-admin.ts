import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0419195254'
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
