import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const toLocalDateTime = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function JobEditModal({ job, onClose, onSave, onUploadImage, busy = false, error = '' }) {
  const [form, setForm] = useState(() => ({
    title: job.title || '', companyName: job.companyName || job.company || '', location: job.location || '',
    jobType: job.jobType || 'full-time', experience: job.experience || '', salary: job.salary || '',
    contactName: job.contactName || job.positions?.[0]?.contactName || '', contactPhone: job.contactPhone || job.positions?.[0]?.contactPhone || '',
    contactEmail: job.contactEmail || '', requirements: job.requirements || '', description: job.description || job.remarks || '',
    expiresAt: toLocalDateTime(job.expiresAt), image: job.image || '',
  }));
  const [imageMode, setImageMode] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const canUploadImage = typeof onUploadImage === 'function';
  const saving = busy || imageBusy;
  const change = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    setImageError('');
    if (!file) { setImageFile(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setImageError('Choose a JPEG, PNG or WebP image under 5 MB.');
      return;
    }
    setImageFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setImageError('');
    try {
      setImageBusy(true);
      const image = canUploadImage && imageMode === 'upload' && imageFile ? await onUploadImage(imageFile) : form.image;
      await onSave({ ...form, image, expiresAt: new Date(form.expiresAt).toISOString() });
    } catch (cause) { setImageError(cause.message || 'Could not upload the opening image.'); }
    finally { setImageBusy(false); }
  };

  return createPortal(<div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form onSubmit={submit} className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white text-slate-950 shadow-2xl sm:rounded-3xl">
      <header className="flex items-start justify-between gap-4 bg-[#19372a] px-5 py-5 text-white sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#cde99d]">Opening management</p><h2 className="mt-1 text-2xl font-black">Edit opening</h2><p className="mt-1 text-sm text-white/70">Update the opening details or choose when it disappears from public listings.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-full border border-white/25 p-2 disabled:opacity-50" aria-label="Close editor"><X size={18} /></button></header>
      <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Opening title<input required maxLength={120} value={form.title} onChange={change('title')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Company or organisation<input required maxLength={120} value={form.companyName} onChange={change('companyName')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Location<input required maxLength={120} value={form.location} onChange={change('location')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Job type<select value={form.jobType} onChange={change('jobType')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal"><option value="full-time">Full time</option><option value="part-time">Part time</option><option value="contract">Contract</option></select></label>
        <label className="grid gap-1.5 text-sm font-bold">Experience<input maxLength={100} value={form.experience} onChange={change('experience')} placeholder="e.g. 2+ years" className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Listing expiry<input required type="datetime-local" min={toLocalDateTime(new Date(Date.now() + 120_000))} value={form.expiresAt} onChange={change('expiresAt')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /><span className="font-normal leading-5 text-slate-500">The opening is hidden from public listings at this time. You can restore it later from Admin Openings.</span></label>
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <span className="text-sm font-bold">Opening image <span className="font-normal text-slate-500">(optional)</span></span>
          {canUploadImage ? <><div className="flex flex-wrap gap-2" role="group" aria-label="Opening image source"><button type="button" onClick={() => setImageMode('upload')} className={`rounded-lg px-3 py-2 text-sm font-bold ${imageMode === 'upload' ? 'bg-[#19372a] text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>Upload image</button><button type="button" onClick={() => setImageMode('link')} className={`rounded-lg px-3 py-2 text-sm font-bold ${imageMode === 'link' ? 'bg-[#19372a] text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>Image URL</button></div>{imageMode === 'upload' ? <><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm" /><p className="text-xs text-slate-500">JPEG, PNG or WebP · maximum 5 MB</p>{(imagePreview || form.image) && <img src={imagePreview || form.image} alt="Opening preview" className="h-40 w-full rounded-xl border border-slate-200 object-cover sm:h-56" />}{imageFile && <button type="button" onClick={() => setImageFile(null)} className="justify-self-start text-sm font-bold text-slate-700 underline">Remove selected image</button>}</> : <label className="grid gap-1.5 text-sm font-bold">Image URL<input type="url" maxLength={2048} value={form.image} onChange={change('image')} placeholder="https://example.com/opening.jpg" className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal" /></label>}</> : <label className="grid gap-1.5 text-sm font-bold">Image URL<input type="url" maxLength={2048} value={form.image} onChange={change('image')} placeholder="https://example.com/opening.jpg" className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal" /></label>}
        </div>
        <label className="grid gap-1.5 text-sm font-bold">Salary<input maxLength={100} value={form.salary} onChange={change('salary')} placeholder="e.g. ₹25,000/month" className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Contact person<input maxLength={100} value={form.contactName} onChange={change('contactName')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Contact phone<input inputMode="numeric" maxLength={15} value={form.contactPhone} onChange={change('contactPhone')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Contact email<input type="email" maxLength={254} value={form.contactEmail} onChange={change('contactEmail')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Requirements<textarea rows={3} maxLength={3000} value={form.requirements} onChange={change('requirements')} className="resize-y rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Description<input required maxLength={5000} value={form.description} onChange={change('description')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {imageError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{imageError}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      </div>
      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:px-7"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#19372a] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button></footer>
    </form>
  </div>, document.body);
}
