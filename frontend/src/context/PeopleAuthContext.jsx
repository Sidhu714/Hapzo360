import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock3, Mail, UserRound } from 'lucide-react';
import AuthPageShell from '../components/AuthPageShell';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { read, remove, write } from '../services/storage';
import { getPersonSession, googlePerson, loginPerson, logoutPerson, registerPerson, sendPersonEmailCode } from './peopleApi';

const PeopleAuthContext = createContext(null);
const ACCOUNTS_KEY = 'peopleAccounts';
const SESSION_KEY = 'peopleSession';
const OTP_TTL_SECONDS = 180;
const RESEND_COOLDOWN_SECONDS = 60;
const cleanPhone = (value = '') => value.replace(/\D/g, '').slice(-10);

const purposeCopy = {
  account: ['People account', 'Create a People account or sign in with your WhatsApp number.'],
  application: ['Apply with your Hapzo account', 'Sign in or create an account to apply for this job.'],
  addEvent: ['Continue to add an event', 'Sign in or create an account to publish a community event.'],
  eventRegistration: ['Register for this event', 'Sign in or create an account to save your event registration.'],
};

export function PeopleAuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [person, setPerson] = useState(() => read(SESSION_KEY, null));

  useEffect(() => {
    let active = true;
    getPersonSession().then((current) => {
      if (!active) return;
      setPerson(current);
      write(SESSION_KEY, current);
    }).catch(() => {
      if (!active) return;
      setPerson(null);
      remove(SESSION_KEY);
    });
    return () => { active = false; };
  }, []);

  const requestPeopleAuth = useCallback((request = {}) => {
    if (person) {
      request.onAuthenticated?.(person);
      return false;
    }
    navigate(`/${request.mode === 'signin' ? 'sign-in' : 'sign-up'}?type=individual`, {
      state: { returnTo: request.returnTo || `${location.pathname}${location.search}`, purpose: request.purpose || 'application', authAction: request.action || null },
    });
    return true;
  }, [person, navigate, location.pathname, location.search]);

  const openPeopleAuth = useCallback((mode = 'signin') => {
    const returnTo = ['/account', '/sign-in', '/sign-up'].includes(location.pathname) || location.pathname.startsWith('/people/') || location.pathname.startsWith('/company/')
      ? (location.state?.returnTo || '/') : `${location.pathname}${location.search}`;
    navigate(`/${mode === 'signup' ? 'sign-up' : 'sign-in'}?type=individual`, { state: { returnTo, purpose: 'account' } });
  }, [navigate, location.pathname, location.search, location.state]);

  const completePeopleAuth = useCallback(async (nextPerson, mode) => {
    const saved = mode === 'google' ? nextPerson : mode === 'signin'
      ? await loginPerson(nextPerson.phone)
      : await registerPerson(nextPerson.name, nextPerson.phone, nextPerson.email, nextPerson.code);
    const accounts = read(ACCOUNTS_KEY, []);
    if (!accounts.some((account) => account.phone === saved.phone)) {
      write(ACCOUNTS_KEY, [...accounts, saved]);
    }
    const session = { ...saved, signedInAt: new Date().toISOString() };
    write(SESSION_KEY, session);
    setPerson(session);
    window.dispatchEvent(new Event('hapzo:person-authenticated'));
    return session;
  }, []);

  const signOutPeople = useCallback(() => {
    logoutPerson().catch(() => {});
    remove(SESSION_KEY);
    setPerson(null);
  }, []);

  const contextValue = useMemo(() => ({ person, requestPeopleAuth, openPeopleAuth, completePeopleAuth, signOutPeople }), [person, requestPeopleAuth, openPeopleAuth, completePeopleAuth, signOutPeople]);

  return (
    <PeopleAuthContext.Provider value={contextValue}>
      {children}
    </PeopleAuthContext.Provider>
  );
}

export function usePeopleAuth() {
  const value = useContext(PeopleAuthContext);
  if (!value) throw new Error('usePeopleAuth must be used within PeopleAuthProvider.');
  return value;
}

export function PeopleAuthForm({ initialMode, unified = false }) {
  const { completePeopleAuth } = usePeopleAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = initialMode;
  const purpose = location.state?.purpose || 'account';
  const returnTo = typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/') && !location.state.returnTo.startsWith('//') ? location.state.returnTo : '/';
  const onComplete = async (account, authMode) => {
    await completePeopleAuth(account, authMode);
    navigate(returnTo, { replace: true, state: location.state?.authAction ? { authAction: location.state.authAction } : null });
  };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [heading, description] = purposeCopy[purpose] || purposeCopy.application;

  useEffect(() => {
    if (secondsLeft <= 0 && resendSecondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setResendSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft > 0, resendSecondsLeft > 0]);

  const switchMode = (nextMode) => {
    navigate(unified ? `/${nextMode === 'signup' ? 'sign-up' : 'sign-in'}?type=individual` : `/people/${nextMode === 'signup' ? 'sign-up' : 'sign-in'}`, { state: location.state });
  };

  const sendOtp = async () => {
    if (otpSent && resendSecondsLeft > 0) return;
    const normalizedPhone = cleanPhone(phone);
    if (googleCredential) {
      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) { setError('Enter a valid 10-digit WhatsApp number.'); return; }
      if (!termsAccepted) { setError('Please accept the Terms & Conditions to create your account.'); return; }
      setBusy(true); setError('');
      try {
        const result = await googlePerson(googleCredential, normalizedPhone, true);
        await onComplete(result.person, 'google');
      } catch (cause) { setError(cause.message || 'Could not complete Google sign-in.'); }
      finally { setBusy(false); }
      return;
    }
    if (mode === 'signup' && !name.trim()) { setError('Enter your full name.'); return; }
    if (mode === 'signup' && !/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (!termsAccepted && mode === 'signup') { setError('Please accept the Terms & Conditions to create your account.'); return; }

    if (mode === 'signin') {
      setError('');
      setBusy(true);
      try { await onComplete({ phone: normalizedPhone }, 'signin'); } catch (cause) { setError(cause.message || 'Could not sign in.'); }
      finally { setBusy(false); }
      return;
    }

    setBusy(true);
    setError('');
    try {
      await sendPersonEmailCode(email.trim(), normalizedPhone);
      setOtp('');
      setOtpSent(true);
      setSecondsLeft(OTP_TTL_SECONDS);
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (cause) { setError(cause.message || 'Could not send the email.'); }
    finally { setBusy(false); }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(otp)) { setError('Enter the 6-digit code from your email.'); return; }
    if (secondsLeft <= 0) { setError('This code expired. Send a new one.'); return; }

    setBusy(true);
    const normalizedPhone = cleanPhone(phone);
    const account = {
      type: 'person',
      name: name.trim(),
      phone: normalizedPhone,
      email: email.trim(),
      code: otp,
    };
    try { await onComplete(account, 'signup'); }
    catch (cause) { setError(cause.message || 'Could not create your account.'); }
    finally { setBusy(false); }
  };

  const signInWithGoogle = async (idToken) => {
    const result = await googlePerson(idToken);
    if (result.person) { await onComplete(result.person, 'google'); return; }
    if (result.needsPhone) {
      setGoogleCredential(idToken);
      setName(result.name || '');
      setEmail(result.email || '');
      setError('');
    }
  };

  return (
    <AuthPageShell kind="people" title={heading} description={description} showAudienceTabs={false}>
      <h2 className="mb-5 text-2xl font-extrabold text-[#20372a]">{googleCredential ? 'Finish your Google sign-in' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
      <p className="mb-5 text-sm text-stone-600">{mode === 'signup' ? 'Already have an account?' : 'New to Hapzo360?'} <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-bold text-[#315844] underline underline-offset-2">{mode === 'signup' ? 'Sign in' : 'Sign up'}</button></p>

      {googleCredential && <p className="mb-4 rounded-xl border border-[#d7e8d7] bg-[#f2f8ef] p-3 text-sm text-[#315844]">Google verified {email}. Add your WhatsApp number to finish creating your account.</p>}
      <form className="space-y-4" onSubmit={mode === 'signin' ? (event) => { event.preventDefault(); sendOtp(); } : verifyOtp}>
        {mode === 'signup' && (
          <label className="block space-y-1.5 text-sm font-semibold text-stone-700">
            Full name
            <span className="relative block">
              <UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={name} onChange={(event) => setName(event.target.value)} disabled={otpSent || Boolean(googleCredential)} autoComplete="name" maxLength={100} className="input pl-10" placeholder="Your name" />
            </span>
          </label>
        )}

        {mode === 'signup' && (
          <label className="block space-y-1.5 text-sm font-semibold text-stone-700">
            Email address
            <span className="relative block">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={otpSent || Boolean(googleCredential)} autoComplete="email" maxLength={254} className="input pl-10" placeholder="you@example.com" />
            </span>
          </label>
        )}

        <label className="block space-y-1.5 text-sm font-semibold text-stone-700">
          {mode === 'signup' || googleCredential ? 'WhatsApp number' : 'Registered mobile number'}
          <span className="relative block">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-500">+91</span>
            <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} disabled={otpSent} maxLength={10} className="input pl-12" placeholder="98765 43210" />
          </span>
          <span className="block text-xs font-normal text-stone-500">{googleCredential ? 'Keep this number for your Hapzo360 account.' : mode === 'signup' ? 'Keep this number for your account. Verification is sent to your email for now.' : 'Enter the number you used at sign-up. No code is needed.'}</span>
        </label>

        {(mode === 'signup' || googleCredential) && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#315844]" />
            <span>I agree to the Hapzo360 <Link to="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-bold text-[#315844] underline">Terms &amp; Conditions</Link>.</span>
          </label>
        )}

        {!otpSent ? (
          <button type="button" onClick={sendOtp} disabled={busy} className="btn-primary w-full">{busy ? 'Please wait…' : googleCredential ? 'Complete Google sign-in' : mode === 'signup' ? 'Send code to email' : 'Sign in with mobile number'}</button>
        ) : (
          <>
            <div className={`rounded-xl border p-3 text-center ${secondsLeft > 0 ? 'border-[#dce6d4] bg-[#f4f8ef]' : 'border-red-200 bg-red-50'}`}>
              <p className="text-xs font-semibold text-stone-600">Verification code sent to {email.trim()}</p>
              {secondsLeft > 0 ? <p className="mt-1 flex items-center justify-center gap-1 text-xs text-stone-500"><Clock3 size={13} /> Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p> : <p className="mt-2 text-sm font-bold text-red-600">Code expired. Send another.</p>}
            </div>
            <label className="block space-y-1.5 text-sm font-semibold text-stone-700">6-digit email code<input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={secondsLeft <= 0} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input" placeholder="Enter code" /></label>
            <div className="flex gap-3">
              <button type="button" onClick={sendOtp} disabled={busy || resendSecondsLeft > 0} className="btn-outline flex-1 disabled:cursor-not-allowed disabled:opacity-50">{resendSecondsLeft > 0 ? `Resend in ${Math.floor(resendSecondsLeft / 60)}:${String(resendSecondsLeft % 60).padStart(2, '0')}` : 'Resend code'}</button>
              <button type="submit" disabled={busy || secondsLeft <= 0} className="btn-primary flex-1">{busy ? 'Verifying…' : 'Verify and continue'}</button>
            </div>
            <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} className="w-full text-center text-sm font-semibold text-stone-500 underline underline-offset-2">Change email or number</button>
          </>
        )}
        {!otpSent && !googleCredential && <GoogleSignInButton onCredential={signInWithGoogle} onError={setError} disabled={busy} />}
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      </form>
    </AuthPageShell>
  );
}
