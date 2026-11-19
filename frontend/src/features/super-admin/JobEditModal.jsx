import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const toLocalDateTime = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function JobEditModal({ job, onClose, onSave, busy = false, error = '' }) {
  const [form, setForm] = useState(() => ({
    title: job.title || '', companyName: job.companyName || job.company || '', location: job.location || '',
    jobType: job.jobType || 'full-time', experience: job.experience || '', salary: job.salary || '',
    contactName: job.contactName || job.positions?.[0]?.contactName || '', contactPhone: job.contactPhone || job.positions?.[0]?.contactPhone || '',
    contactEmail: job.contactEmail || '', requirements: job.requirements || '', description: job.description || job.remarks || '',
    expiresAt: toLocalDateTime(job.expiresAt),
  }));
  const change = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  return createPortal(<div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, expiresAt: new Date(form.expiresAt).toISOString() }); }} className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white text-slate-950 shadow-2xl sm:rounded-3xl">
      <header className="flex items-start justify-between gap-4 bg-[#19372a] px-5 py-5 text-white sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#cde99d]">Opening management</p><h2 className="mt-1 text-2xl font-black">Edit opening</h2><p className="mt-1 text-sm text-white/70">Update the opening details or choose when it disappears from public listings.</p></div><button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-white/25 p-2 disabled:opacity-50" aria-label="Close editor"><X size={18} /></button></header>
      <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Opening title<input required maxLength={120} value={form.title} onChange={change('title')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Company or organisation<input required maxLength={120} value={form.companyName} onChange={change('companyName')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Location<input required maxLength={120} value={form.location} onChange={change('location')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Job type<select value={form.jobType} onChange={change('jobType')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal"><option value="full-time">Full time</option><option value="part-time">Part time</option><option value="contract">Contract</option></select></label>
        <label className="grid gap-1.5 text-sm font-bold">Experience<input maxLength={100} value={form.experience} onChange={change('experience')} placeholder="e.g. 2+ years" className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Listing expiry<input required type="datetime-local" min={toLocalDateTime(new Date(Date.now() + 120_000))} value={form.expiresAt} onChange={change('expiresAt')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /><span className="font-normal leading-5 text-slate-500">The opening is hidden from public listings at this time. You can restore it later from Admin Openings.</span></label>
        <label className="grid gap-1.5 text-sm font-bold">Salary<input maxLength={100} value={form.salary} onChange={change('salary')} placeholder="e.g. ₹25,000/month" className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Contact person<input maxLength={100} value={form.contactName} onChange={change('contactName')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Contact phone<input inputMode="numeric" maxLength={15} value={form.contactPhone} onChange={change('contactPhone')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Contact email<input type="email" maxLength={254} value={form.contactEmail} onChange={change('contactEmail')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Requirements<textarea rows={3} maxLength={3000} value={form.requirements} onChange={change('requirements')} className="resize-y rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Description<input required maxLength={5000} value={form.description} onChange={change('description')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      </div>
      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:px-7"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">Cancel</button><button disabled={busy} className="rounded-xl bg-[#19372a] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button></footer>
    </form>
  </div>, document.body);
}
