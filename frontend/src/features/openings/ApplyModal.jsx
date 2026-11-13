import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Phone, UserRound } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslatedJob } from '../../hooks/useTranslatedJob';
import Modal from '../../components/Modal';
import * as api from './openingsApiRemote';

export default function ApplyModal({ job, person, onClose }) {
  const { t } = useLanguage();
  const v = useTranslatedJob(job, ['title']);
  const positionContact = job.positions?.[0] || {};
  const [applicationContact, setApplicationContact] = useState(null);
  const contactName = applicationContact?.contactName || positionContact.contactName || job.contactName || '';
  const contactPhone = applicationContact?.contactPhone || positionContact.contactPhone || job.contactPhone || '';
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!termsAccepted) {
      setErr('Please agree to the Hapzo360 Terms & Conditions before submitting your application.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const result = await api.submitApplication({
        jobId: job.id,
        jobTitle: job.title,
        name: person.name,
        phone: person.phone,
        personId: person.id,
      });
      setApplicationContact(result);
      setDone(true);
    } catch (error) {
      console.error('Application submission error:', error);
      setErr(error.message || 'Unable to submit your application. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('apply.title')} onClose={onClose}>
      <p className="mb-4 text-sm text-stone-500">{v.title} · {job.companyName}</p>

      {done ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <p className="mt-3 font-medium text-stone-800">{t('apply.done')}</p>
          {(contactName || contactPhone) && (
            <section className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left">
              <h3 className="font-semibold text-stone-900">{t('apply.contactTitle')}</h3>
              {contactName && <p className="mt-2 text-sm text-stone-700">{contactName}</p>}
              {contactPhone && <a className="mt-1 inline-block text-sm font-semibold text-brand-700" href={`tel:${contactPhone}`}>{contactPhone}</a>}
            </section>
          )}
          <button className="btn-outline mt-5" onClick={onClose}>OK</button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">Applying as</p>
            <p className="flex items-center gap-2 text-sm font-semibold text-stone-800"><UserRound size={16} />{person.name}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-stone-600"><Phone size={15} />+91 {person.phone} · WhatsApp verified</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm leading-5 text-stone-600">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-800" />
            <span>I agree to the Hapzo360{' '}
              <Link to="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline underline-offset-2">Terms &amp; Conditions</Link>{' '}
              for job applications.
            </span>
          </label>

          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Submitting…' : t('apply.submit')}</button>
        </form>
      )}
    </Modal>
  );
}
