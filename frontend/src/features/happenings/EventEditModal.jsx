import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ALL_INDIA, STATES, districtOptionsForState, eventLocation } from '../../data/indiaLocations';

const dayValue = (value) => {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

export default function EventEditModal({ event, allowOrganizer = false, onClose, onSave, onUploadImage, busy = false, error = '' }) {
  const [form, setForm] = useState(() => ({
    title: event.title || '', organizer: event.organizer || '', date: dayValue(event.date), time: event.time || '',
    venue: event.venue || '', location: event.location || '', state: event.state || '', district: event.district || '', category: event.category || 'Community', sector: event.sector || '',
    specialty: event.specialty || '', description: event.description || '', contactPhone: event.contactPhone || '', registrationUrl: event.registrationUrl || '', image: event.image || '',
  }));
  const [imageMode, setImageMode] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const change = (name) => (input) => setForm((current) => ({ ...current, [name]: input.target.value }));
  const canUploadImage = allowOrganizer && typeof onUploadImage === 'function';
  const saving = busy || imageBusy;
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const chooseImage = (input) => {
    const file = input.target.files?.[0];
    setImageError('');
    if (!file) { setImageFile(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setImageError('Choose a JPEG, PNG or WebP image under 5 MB.');
      return;
    }
    setImageFile(file);
  };
  const submit = async (input) => {
    input.preventDefault();
    setImageError('');
    try {
      setImageBusy(true);
      const image = canUploadImage && imageMode === 'upload' && imageFile ? await onUploadImage(imageFile) : form.image;
      const selectedLocation = form.district ? eventLocation(form.state, form.district) : { state: form.state, district: '', location: form.location };
      await onSave({ ...form, ...selectedLocation, image, date: form.date ? new Date(`${form.date}T12:00:00+05:30`).toISOString() : '' });
    } catch (cause) { setImageError(cause.message || 'Could not upload the event image.'); }
    finally { setImageBusy(false); }
  };
  return createPortal(<div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-5" onMouseDown={(input) => input.target === input.currentTarget && onClose()}>
    <form onSubmit={submit} className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white text-slate-950 shadow-2xl sm:rounded-3xl">
      <header className="flex items-start justify-between gap-4 bg-slate-900 px-5 py-5 text-white sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime-200">Happening management</p><h2 className="mt-1 text-2xl font-black">Edit event</h2><p className="mt-1 text-sm text-white/70">Changes are saved safely. Company changes return to review.</p></div><button type="button" onClick={onClose} className="rounded-full border border-white/25 p-2" aria-label="Close editor"><X size={18} /></button></header>
      <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Event name<input required maxLength={120} value={form.title} onChange={change('title')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {allowOrganizer && <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Organiser<input required maxLength={120} value={form.organizer} onChange={change('organizer')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>}
        <label className="grid gap-1.5 text-sm font-bold">Date<input required type="date" value={form.date} onChange={change('date')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Time<input value={form.time} onChange={change('time')} placeholder="5:00 PM" maxLength={20} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Venue<input required maxLength={200} value={form.venue} onChange={change('venue')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">State<select value={form.state} onChange={(input) => setForm((current) => ({ ...current, state: input.target.value, district: '' }))} className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"><option value="">Select state</option>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-bold">District<select value={form.district} onChange={change('district')} className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"><option value="">Keep current location</option>{districtOptionsForState(form.state).map((district) => <option key={district} value={district}>{district}</option>)}</select><span className="text-xs font-normal text-slate-500">Choose {ALL_INDIA} for a nationwide event.</span></label>
        <label className="grid gap-1.5 text-sm font-bold">Category<input maxLength={80} value={form.category} onChange={change('category')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Sector<input maxLength={80} value={form.sector} onChange={change('sector')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold">Specialty<input maxLength={80} value={form.specialty} onChange={change('specialty')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Contact phone<input inputMode="numeric" maxLength={10} value={form.contactPhone} onChange={change('contactPhone')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Registration link <span className="font-normal text-slate-500">(optional)</span><input type="url" inputMode="url" maxLength={2048} value={form.registrationUrl} onChange={change('registrationUrl')} placeholder="https://forms.example.com/your-event" className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {canUploadImage ? <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <span className="text-sm font-bold">Event image <span className="font-normal text-slate-500">(optional)</span></span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Event image source">
            <button type="button" onClick={() => setImageMode('upload')} className={`rounded-lg px-3 py-2 text-sm font-bold ${imageMode === 'upload' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>Upload image</button>
            <button type="button" onClick={() => setImageMode('link')} className={`rounded-lg px-3 py-2 text-sm font-bold ${imageMode === 'link' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>Image URL</button>
          </div>
          {imageMode === 'upload' ? <><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm" />
            <p className="text-xs text-slate-500">JPEG, PNG or WebP · maximum 5 MB</p>
            {(imagePreview || form.image) && <img src={imagePreview || form.image} alt="Event preview" className="max-h-64 w-full rounded-xl border border-slate-200 object-cover" />}
            {imageFile && <button type="button" onClick={() => setImageFile(null)} className="justify-self-start text-sm font-bold text-slate-700 underline">Remove selected image</button>}</> : <label className="grid gap-1.5 text-sm font-bold">Image URL<input type="url" maxLength={2048} value={form.image} onChange={change('image')} placeholder="https://example.com/event.jpg" className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal" /></label>}
        </div> : <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Image URL<input maxLength={2048} value={form.image} onChange={change('image')} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>}
        <label className="grid gap-1.5 text-sm font-bold sm:col-span-2">Description<textarea rows={4} maxLength={1200} value={form.description} onChange={change('description')} className="resize-y rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label>
        {imageError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{imageError}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      </div>
      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:px-7"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button></footer>
    </form>
  </div>, document.body);
}
