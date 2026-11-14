import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const dayValue = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export default function EventEditModal({ event, allowOrganizer = false, onClose, onSave, busy = false, error = '' }) {
  const [form, setForm] = useState(() => ({
    title: event.title || '', organizer: event.organizer || '', date: dayValue(event.date), time: event.time || '',
    venue: event.venue || '', location: event.location || '', category: event.category || 'Community', sector: event.sector || '',
    specialty: event.specialty || '', description: event.description || '', contactPhone: event.contactPhone || '', image: event.image || '',
  }));
  const change = (name) => (input) => setForm((current) => ({ ...current, [name]: input.target.value }));
  const submit = (input) => { input.preventDefault(); onSave({ ...form, date: form.date ? new Date(`${form.date}T12:00:00+05:30`).toISOString() : '' }); };
  return createPortal(<div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5" onMouseDown={(input) => input.target === input.currentTarget && onClose()}>
    <form onSubmit={submit} className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white text-slate-950 shadow-2xl sm:rounded-3xl">
      <header className="flex items-start justify-between gap-4 bg-slate-900 px-5 py-5 text-white sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-200">Happening management</p><h2 className="mt-1 text-2xl font-black">Edit event</h2><p className="mt-1 text-sm text-white/70">Changes are saved safely. Company changes return to review.</p></div><button type="button" onClick={onClose} className="rounded-full border border-white/25 p-2" aria-label="Close editor"><X size={18} /></button></header>
      <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Event name<input required maxLength={120} value={form.title} onChange={change('title')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {allowOrganizer && <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Organiser<input required maxLength={120} value={form.organizer} onChange={change('organizer')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>}
        <label className="grid gap-1.5 text-sm font-bold">Date<input required type="date" value={form.date} onChange={change('date')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Time<input value={form.time} onChange={change('time')} placeholder="5:00 PM" maxLength={20} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Venue<input required maxLength={200} value={form.venue} onChange={change('venue')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Location<input maxLength={120} value={form.location} onChange={change('location')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Category<input maxLength={80} value={form.category} onChange={change('category')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Sector<input maxLength={80} value={form.sector} onChange={change('sector')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Specialty<input maxLength={80} value={form.specialty} onChange={change('specialty')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Contact phone<input inputMode="numeric" maxLength={10} value={form.contactPhone} onChange={change('contactPhone')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Image URL<input maxLength={2048} value={form.image} onChange={change('image')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Description<textarea rows={4} maxLength={1200} value={form.description} onChange={change('description')} className="resize-y rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      </div>
      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:px-7"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">Cancel</button><button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button></footer>
    </form>
  </div>, document.body);
}
