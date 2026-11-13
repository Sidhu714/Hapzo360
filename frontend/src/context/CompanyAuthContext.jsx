import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock3, Eye, EyeOff } from 'lucide-react';
import AuthPageShell from '../components/AuthPageShell';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { read, remove, write } from '../services/storage';
import * as api from '../features/openings/openingsApiRemote';
import { usePeopleAuth } from './PeopleAuthContext';

const Context = createContext(null);
const SESSION_KEY = 'companySession';
const OTP_TTL_SECONDS = 180;
const RESEND_COOLDOWN_SECONDS = 60;
const emptyProfile = { companyName: '', contactPerson: '', contactDesignation: '', industry: '', location: '', website: '', businessRegistrationNumber: '' };

export function CompanyAuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOutPeople } = usePeopleAuth();
  const [company, setCompany] = useState(() => read(SESSION_KEY, null));
  useEffect(() => {
    let active = true;
    api.getCompanySession().then((current) => {
      if (!active) return;
      setCompany(current);
      write(SESSION_KEY, current);
    }).catch(() => {
      if (!active) return;
      setCompany(null);
      remove(SESSION_KEY);
    });
    return () => { active = false; };
  }, []);
  const openCompanyAuth = useCallback((mode = 'signin') => {
    const returnTo = ['/account', '/sign-in', '/sign-up'].includes(location.pathname) || location.pathname.startsWith('/people/') || location.pathname.startsWith('/company/sign-')
      ? (location.state?.returnTo || '/') : `${location.pathname}${location.search}`;
    navigate(`/${mode === 'signup' ? 'sign-up' : 'sign-in'}?type=company`, { state: { returnTo } });
  }, [navigate, location.pathname, location.search, location.state]);
  const requestCompanyAuth = useCallback((onAuthenticated, action = null) => {
    if (company?.companyName) { onAuthenticated?.(company); return; }
    navigate('/sign-in?type=company', { state: { returnTo: `${location.pathname}${location.search}`, authAction: action } });
  }, [company, navigate, location.pathname, location.search]);
  const complete = useCallback((profile) => {
    signOutPeople();
    const session = { ...profile, signedInAt: new Date().toISOString() };
    write(SESSION_KEY, session);
    setCompany(session);
    return session;
  }, [signOutPeople]);
  const signOutCompany = useCallback(() => { api.logoutCompany().catch(() => {}); remove(SESSION_KEY); setCompany(null); }, []);
  useEffect(() => {
    window.addEventListener('hapzo:person-authenticated', signOutCompany);
    return () => window.removeEventListener('hapzo:person-authenticated', signOutCompany);
  }, [signOutCompany]);
  const value = useMemo(() => ({ company, openCompanyAuth, requestCompanyAuth, completeCompanyAuth: complete, signOutCompany }), [company, openCompanyAuth, requestCompanyAuth, complete, signOutCompany]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCompanyAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useCompanyAuth must be used within CompanyAuthProvider.');
  return value;
}

export function CompanyAuthForm({ initialMode, unified = false }) {
  const { completeCompanyAuth } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = initialMode;
  const returnTo = typeof location.state?.returnTo === 'string' && location.state.returnTo.startsWith('/') && !location.state.returnTo.startsWith('//') ? location.state.returnTo : '/';
  const onComplete = (profile) => {
    completeCompanyAuth(profile);
    navigate(returnTo, { replace: true, state: location.state?.authAction ? { authAction: location.state.authAction } : null });
  };
  const [step, setStep] = useState('contact');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [googleCredential, setGoogleCredential] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bind = (name) => ({ value: profile[name], onChange: (event) => setProfile((current) => ({ ...current, [name]: event.target.value })) });

  useEffect(() => {
    if (step !== 'otp' || (secondsLeft <= 0 && resendSecondsLeft <= 0)) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
      setResendSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, secondsLeft > 0, resendSecondsLeft > 0]);

  const switchMode = (nextMode) => {
    navigate(unified ? `/${nextMode === 'signup' ? 'sign-up' : 'sign-in'}?type=company` : `/company/${nextMode === 'signup' ? 'sign-up' : 'sign-in'}`, { state: location.state });
  };

  const sendOtp = async (event) => {
    event.preventDefault();
    if (step === 'otp' && resendSecondsLeft > 0) return;
    if (!profile.companyName.trim()) { setError('Enter your company name.'); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit WhatsApp number.'); return; }
    if (!profile.businessRegistrationNumber.trim()) { setError('Enter your GST or NSME registration number.'); return; }
    if (!termsAccepted) { setError('Please accept the Terms & Conditions to create your company account.'); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError('Enter a valid company email.'); return; }
    setError(''); setBusy(true);
    try {
      if (await api.companyAccountExists(normalizedEmail)) {
        throw new Error('This company email is registered. Choose Sign in.');
      }
      await api.sendCompanyEmailCode(normalizedEmail, phone);
      setOtp('');
      setVerificationToken('');
      setSecondsLeft(OTP_TTL_SECONDS);
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setStep('otp');
    } catch (cause) { setError(cause.message || 'Could not send the email code.'); }
    finally { setBusy(false); }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (secondsLeft <= 0) { setError('This code expired. Send a new one.'); return; }
    if (!/^[0-9]{6}$/.test(otp)) { setError('Enter the 6-digit code from your email.'); return; }
    setError(''); setBusy(true);
    try {
      const token = await api.verifyCompanyEmailCode(email.trim().toLowerCase(), phone, otp);
      setVerificationToken(token);
      setStep('profile');
    } catch (cause) { setError(cause.message || 'Could not verify the email code.'); }
    finally { setBusy(false); }
  };

  const register = async (event) => {
    event.preventDefault();
    if (step !== 'profile' || (!verificationToken && !googleCredential)) return;
    if (!termsAccepted) { setError('Please accept the Terms & Conditions.'); return; }
    if (!profile.businessRegistrationNumber.trim()) { setError('Enter your GST or NSME registration number.'); return; }
    setError(''); setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const saved = googleCredential
        ? (await api.googleCompany(googleCredential, { ...profile, phone }, password, true)).company
        : await api.registerCompanyAccount({ email: normalizedEmail, password, profile: { ...profile, phone }, verificationToken, termsAccepted });
      onComplete(saved);
    } catch (cause) { setError(cause.message || 'Could not register your company. Please try again.'); }
    finally { setBusy(false); }
  };

  const signIn = async (event) => {
    event.preventDefault();
    setError(''); setBusy(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await api.loginCompanyAccount({ email: normalizedEmail, password });
      const saved = await api.getCompanyByEmail(normalizedEmail);
      if (!saved?.companyName) throw new Error('Your company profile is incomplete. Please complete registration.');
      onComplete(saved);
    } catch (cause) { setError(cause.message || 'Could not sign in. Please try again.'); }
    finally { setBusy(false); }
  };

  const signInWithGoogle = async (idToken) => {
    const result = await api.googleCompany(idToken);
    if (result.company) { onComplete(result.company); return; }
    if (result.needsProfile) {
      setGoogleCredential(idToken);
      setVerificationToken('');
      setEmail(result.email || '');
      setProfile((current) => ({ ...current, contactPerson: result.name || current.contactPerson }));
      setStep('profile');
      setError('');
    }
  };

  return <AuthPageShell kind="company" title={mode === 'signup' ? 'Register your company' : 'Company sign in'} description="Reach local people with a company account. Your profile and job posts stay together in one place." showAudienceTabs={unified}>
    <h2 className="mb-5 text-2xl font-extrabold text-[#25171c]">{googleCredential ? 'Finish your company account' : mode === 'signup' ? 'Create a company account' : 'Welcome back'}</h2>
    <p className="mb-5 text-sm text-stone-600">{mode === 'signup' ? 'Already have a company account?' : 'New company?'} <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-bold text-[#315844] underline underline-offset-2">{mode === 'signup' ? 'Sign in' : 'Sign up'}</button></p>
    {(mode === 'signup' || googleCredential) && <p className="mb-4 text-sm text-stone-600">{step === 'profile' ? 'Company email verified. Add your company information and create a password.' : 'Start with your company name, email, WhatsApp number and one business registration number.'}</p>}

    {mode === 'signup' && step === 'contact' && <form onSubmit={sendOtp} className="space-y-4">
      <label className="block text-sm font-semibold text-stone-700">Company name<input type="text" required autoComplete="organization" maxLength={120} value={profile.companyName} onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))} className="input mt-1.5" /></label>
      <label className="block text-sm font-semibold text-stone-700">Company email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-1.5" /></label>
      <label className="block text-sm font-semibold text-stone-700">WhatsApp number<span className="relative mt-1.5 block"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-500">+91</span><input type="tel" required inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} className="input pl-12" placeholder="98765 43210" /></span></label>
      <label className="block text-sm font-semibold text-stone-700">GST / NSME registration number <span className="text-red-600">(Required)</span><input required value={profile.businessRegistrationNumber} onChange={(event) => setProfile((current) => ({ ...current, businessRegistrationNumber: event.target.value.toUpperCase() }))} maxLength={30} autoCapitalize="characters" className="input mt-1.5" placeholder="Enter GST or NSME number" /></label>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#315844]" /><span>I agree to the Hapzo360 <Link to="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-bold text-[#315844] underline">Terms &amp; Conditions</Link>.</span></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Sending code…' : 'Send code to email'}</button>
    </form>}
    {mode === 'signup' && step === 'contact' && <div className="mt-4"><GoogleSignInButton onCredential={signInWithGoogle} onError={setError} disabled={busy} /></div>}

    {mode === 'signup' && step === 'otp' && <form onSubmit={verifyOtp} className="space-y-4">
      <p className="text-sm text-stone-600">Enter the code sent to {email.trim().toLowerCase()}. Your WhatsApp number is +91 {phone}.</p>
      <div className={`rounded-xl border p-3 text-center ${secondsLeft > 0 ? 'border-[#dce6d4] bg-[#f4f8ef]' : 'border-red-200 bg-red-50'}`}>
        <p className="text-xs font-semibold text-stone-600">Email verification code</p>
        {secondsLeft > 0 ? <p className="mt-1 flex items-center justify-center gap-1 text-xs text-stone-500"><Clock3 size={13} /> Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p> : <p className="mt-2 text-sm font-bold text-red-600">Code expired. Send another.</p>}
      </div>
      <label className="block text-sm font-semibold text-stone-700">6-digit email code<input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={secondsLeft <= 0} inputMode="numeric" autoComplete="one-time-code" className="input mt-1.5" placeholder="Enter code" /></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3"><button type="button" onClick={sendOtp} disabled={busy || resendSecondsLeft > 0} className="btn-outline flex-1 disabled:cursor-not-allowed disabled:opacity-50">{resendSecondsLeft > 0 ? `Resend in ${Math.floor(resendSecondsLeft / 60)}:${String(resendSecondsLeft % 60).padStart(2, '0')}` : 'Resend code'}</button><button disabled={busy || secondsLeft <= 0} className="btn-primary flex-1">Verify and continue</button></div>
      <button type="button" onClick={() => { setStep('contact'); setOtp(''); setError(''); }} className="w-full text-center text-sm font-semibold text-stone-500 underline underline-offset-2">Change email or number</button>
    </form>}

    {(mode === 'signup' || googleCredential) && step === 'profile' && <form onSubmit={register} className="space-y-4">
      <div className="rounded-xl bg-[#f4f8ef] px-4 py-3 text-sm text-[#315844]">{email.trim().toLowerCase()} verified · WhatsApp: +91 {phone}</div>
      {googleCredential && <label className="block text-sm font-semibold text-stone-700">GST / NSME registration number <span className="text-red-600">(Required)</span><input required value={profile.businessRegistrationNumber} onChange={(event) => setProfile((current) => ({ ...current, businessRegistrationNumber: event.target.value.toUpperCase() }))} maxLength={30} className="input mt-1.5" placeholder="Enter GST or NSME number" /></label>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-stone-700">Company name<input required maxLength={120} className="input mt-1.5" {...bind('companyName')} /></label>
        <label className="block text-sm font-semibold text-stone-700">Industry<input required maxLength={100} className="input mt-1.5" {...bind('industry')} /></label>
        <label className="block text-sm font-semibold text-stone-700">Contact person<input required maxLength={100} className="input mt-1.5" {...bind('contactPerson')} /></label>
        <label className="block text-sm font-semibold text-stone-700">City / location<input required maxLength={100} className="input mt-1.5" {...bind('location')} /></label>
        <label className="block text-sm font-semibold text-stone-700">Contact designation<input maxLength={100} className="input mt-1.5" {...bind('contactDesignation')} /></label>
        <label className="block text-sm font-semibold text-stone-700">Website (optional)<input type="url" className="input mt-1.5" {...bind('website')} /></label>
        <label className="block text-sm font-semibold text-stone-700 sm:col-span-2">Create password<span className="relative mt-1.5 block"><input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input pr-11" placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#315844]" /><span>I agree to the Hapzo360 <Link to="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-bold text-[#315844] underline">Terms &amp; Conditions</Link>.</span></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Registering…' : 'Register company'}</button>
    </form>}

    {mode === 'signin' && !googleCredential && <form onSubmit={signIn} className="space-y-4">
      <label className="block text-sm font-semibold text-stone-700">Company email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-1.5" /></label>
      <label className="block text-sm font-semibold text-stone-700">Password<span className="relative mt-1.5 block"><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>}
    {mode === 'signin' && !googleCredential && <div className="mt-4"><GoogleSignInButton onCredential={signInWithGoogle} onError={setError} disabled={busy} /></div>}
  </AuthPageShell>;
}
