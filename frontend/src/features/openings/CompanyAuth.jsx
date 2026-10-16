import { useState } from 'react';
import Field from '../../components/Field';
import * as api from './openingsApi';

const EMPTY = { companyName: '', contactPerson: '', email: '', phone: '', location: '', industry: '', website: '' };

export default function CompanyAuth({ onAuth }) {
  const [mode, setMode] = useState('register');
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const bind = (n) => ({ value: f[n], onChange: (e) => setF({ ...f, [n]: e.target.value }) });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      onAuth(mode === 'register' ? await api.registerCompany(f) : await api.loginCompany(f.email));
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl py-5"><section className="page-hero mb-6 px-6 py-8 md:px-10"><p className="page-kicker">For employers</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Your next great hire starts here.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#c5d0c7]">Create your company profile once. Come back anytime to publish another opening.</p></section><div className="mx-auto max-w-xl">
      <div className="mb-4 flex gap-4 border-b border-stone-200 text-sm font-medium">
        {[['register', 'Register company'], ['login', 'Sign in']].map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setErr(''); }}
            className={`-mb-px border-b-2 pb-2 ${mode === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500'}`}>{l}</button>
        ))}
      </div>
      <form className="surface-card space-y-4 p-6 md:p-8" onSubmit={submit}>
        {mode === 'register' ? (
          <>
            <Field label="Company name" required {...bind('companyName')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact person" required {...bind('contactPerson')} />
              <Field label="Phone" type="tel" required {...bind('phone')} />
              <Field label="Email" type="email" required {...bind('email')} />
              <Field label="City / location" required {...bind('location')} />
              <Field label="Industry" required {...bind('industry')} />
              <Field label="Website (optional)" type="url" {...bind('website')} />
            </div>
          </>
        ) : <Field label="Registered email" type="email" required {...bind('email')} />}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Register and continue' : 'Sign in'}</button>
      </form>
    </div></div>
  );
}
