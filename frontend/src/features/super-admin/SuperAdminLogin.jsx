import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { loginAdmin } from './adminApi';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loginAdmin(username.trim().toLowerCase(), password);
      navigate('/super-admin', { replace: true });
    } catch (cause) {
      setError(cause.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-[#101f1c] px-4 py-12 text-white sm:py-20">
    <div className="mx-auto max-w-md">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#c7e6b7] hover:text-white"><ArrowRight className="rotate-180" size={17} /> Back to Hapzo360</Link>
      <div className="mt-12 overflow-hidden rounded-[28px] border border-white/15 bg-[#172c27] shadow-2xl shadow-black/30">
        <div className="border-b border-white/10 bg-[#1e3931] px-7 py-7 sm:px-9">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b8da9c] text-[#173226]"><ShieldCheck size={23} /></span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-[#b8da9c]">Private access</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">Sign in with your administrator credentials.</p>
        </div>
        <form onSubmit={submit} className="space-y-5 px-7 py-8 sm:px-9">
          <label className="block text-sm font-semibold">Username<input type="text" required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-[#b8da9c]" placeholder="Your admin username" /></label>
          <label className="block text-sm font-semibold">Password<span className="relative mt-2 block"><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-12 text-white outline-none focus:border-[#b8da9c]" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/65 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          {error && <p role="alert" className="rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b8da9c] px-5 py-3.5 font-extrabold text-[#173226] transition hover:bg-[#d4ecbf] disabled:opacity-60"><LockKeyhole size={17} /> {busy ? 'Checking access…' : 'Sign in securely'}</button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-white/45">Administrator accounts are created privately. There is no public signup.</p>
    </div>
  </main>;
}
