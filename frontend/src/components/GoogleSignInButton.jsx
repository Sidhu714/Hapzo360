import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export default function GoogleSignInButton({ onCredential, onError, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    onError('');
    try {
      const result = await signInWithPopup(auth, provider);
      await onCredential(await result.user.getIdToken());
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        const message = error.code === 'auth/operation-not-allowed'
          ? 'Google sign-in is not enabled in Firebase Authentication yet.'
          : error.message || 'Google sign-in could not be completed.';
        onError(message);
      }
    } finally {
      await signOut(auth).catch(() => {});
      setBusy(false);
    }
  };

  return <div className="space-y-3">
    <div className="flex items-center gap-3 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" />or continue with<span className="h-px flex-1 bg-stone-200" /></div>
    <button type="button" onClick={start} disabled={disabled || busy} className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-[#26362d] shadow-sm transition hover:border-[#9fb8a4] hover:bg-[#f9fbf8] disabled:cursor-not-allowed disabled:opacity-60">
      <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.9 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A24.04 24.04 0 0 0 0 24c0 3.87.93 7.5 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
      {busy ? 'Connecting to Google…' : 'Sign in with Google'}
    </button>
  </div>;
}
