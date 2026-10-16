import { useState } from 'react';
import { JOB_TYPES } from '../../config';
import Modal from '../../components/Modal';
import Field from '../../components/Field';

const EMPTY = { title: '', jobType: 'full-time', location: '', salary: '', experience: '', description: '', requirements: '', image: '' };
const MAX_IMAGE = 400 * 1024; // demo limit because images are stored in localStorage

export default function JobForm({ onSubmit, onClose }) {
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const bind = (n) => ({ value: f[n], onChange: (e) => setF({ ...f, [n]: e.target.value }) });

  const pickImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE) { setErr('Image must be under 400 KB.'); e.target.value = ''; return; }
    setErr('');
    const r = new FileReader();
    r.onload = () => setF((p) => ({ ...p, image: r.result }));
    r.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await onSubmit(f); } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <Modal wide title="Post a job" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {/* <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-800">Write in English. Job seekers will see it in Tamil, Hindi or English automatically.</p> */}
        <Field label="Role / job title" required {...bind('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job type" as="select" required {...bind('jobType')}>
            {JOB_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
          </Field>
          <Field label="Location" required {...bind('location')} />
          <Field label="Salary (optional)" placeholder="e.g. ₹25,000 / month" {...bind('salary')} />
          <Field label="Experience (optional)" placeholder="e.g. 2+ years" {...bind('experience')} />
        </div>
        <Field label="Job description" as="textarea" rows={4} required {...bind('description')} />
        <Field label="Requirements" as="textarea" rows={3} required {...bind('requirements')} />
        <label className="block">
          <span className="label">Image (optional, max 400 KB)</span>
          <input type="file" accept="image/*" onChange={pickImage} className="text-sm" />
        </label>
        {f.image && <img src={f.image} alt="" className="h-24 rounded-lg object-cover" />}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Posting…' : 'Publish job'}</button>
      </form>
    </Modal>
  );
}
