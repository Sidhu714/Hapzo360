import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslatedJob } from '../../hooks/useTranslatedJob';
import Modal from '../../components/Modal';
import Field from '../../components/Field';
import * as api from './openingsApi';

export default function ApplyModal({ job, onClose }) {
  const { t } = useLanguage();
  const v = useTranslatedJob(job, ['title']);
  const [f, setF] = useState({ name: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(f.phone)) { setErr(t('apply.phoneError')); return; }
    setErr(''); setBusy(true);
    await api.submitApplication({ jobId: job.id, jobTitle: job.title, ...f });
    setDone(true);
  };

  return (
    <Modal title={t('apply.title')} onClose={onClose}>
      <p className="mb-4 text-sm text-stone-500">{v.title} · {job.companyName}</p>
      {done ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <p className="mt-3 font-medium text-stone-800">{t('apply.done')}</p>
          <button className="btn-outline mt-5" onClick={onClose}>OK</button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label={t('apply.name')} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label={t('apply.phone')} required type="tel" inputMode="numeric" maxLength={10} placeholder="98765 43210"
            value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>{t('apply.submit')}</button>
        </form>
      )}
    </Modal>
  );
}
