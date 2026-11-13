import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID || 'hapzo360';
const app = getApps()[0] || initializeApp({ projectId });

export async function verifyGoogleIdentity(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 10000) return null;
  try {
    const claims = await getAuth(app).verifyIdToken(idToken);
    if (claims.firebase?.sign_in_provider !== 'google.com' || claims.email_verified !== true || !claims.email || !claims.uid) return null;
    return { uid: claims.uid, email: claims.email.trim().toLowerCase(), name: String(claims.name || '').trim().slice(0, 100), hostedDomain: String(claims.hd || '') };
  } catch {
    return null;
  }
}
