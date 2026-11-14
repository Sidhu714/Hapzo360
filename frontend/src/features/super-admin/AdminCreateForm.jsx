import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { DISTRICTS } from '../../data/indiaLocations';
import SearchSelect from '../openings/SearchSelect';
import { fallbackSuggestions, suggestionBank } from '../happenings/eventSuggestions';
import { createAdminEvent, uploadEditorialImage } from './adminApi';

const categories = ['Business', 'Community', 'Workshops', 'Webinar', 'Conference', 'Expo'];
const sectors = ['Textile', 'Education', 'Engineering', 'Technology'];
const sectorSpecialties = {
  Textile: ['Spinning', 'Weaving', 'Knitting', 'Dyeing', 'Printing', 'Garment manufacturing', 'Embroidery', 'Textile trading'],
  Education: ['School education', 'Higher education', 'Coaching', 'Vocational training', 'EdTech', 'Research'],
  Engineering: ['Civil', 'Mechanical', 'Electrical', 'Electronics', 'Automotive', 'Manufacturing', 'Construction'],
  Technology: ['Software', 'AI and data', 'Cybersecurity', 'Cloud', 'Hardware', 'IT services', 'Product development'],
};
const emptyEvent = { title: '', organizer: '', district: '', venue: '', date: '', timeHour: '', timeMinute: '00', timePeriod: 'AM', category: 'Community', sector: 'Textile', specialty: '', description: '', contactPhone: '', registrationUrl: '', imageUrl: '' };
const fieldClass = 'block space-y-2 text-sm font-bold text-[#11192f]';
const inputClass = 'w-full rounded-xl border border-[#11192f]/10 bg-white px-4 py-3.5 text-sm font-normal text-[#11192f] outline-none placeholder:text-[#11192f]/35 focus:border-[#50627e] focus:ring-2 focus:ring-[#ff5577]/30';

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function AdminCreateForm({ onCreated }) {
  const [form, setForm] = useState(emptyEvent);
  const [imageMode, setImageMode] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const suggestions = useMemo(() => suggestionBank[`${form.category}-${form.sector}`] || fallbackSuggestions, [form.category, form.sector]);
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const bind = (name) => ({ value: form[name], onChange: (event) => update(name, event.target.value) });

  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const chooseImage = (file) => {
    setError('');
    if (!file) { setImageFile(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG or WebP image under 5 MB.');
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };

  const addSuggestion = (suggestion) => {
    const line = `• ${suggestion}`;
    if (form.description.includes(line)) return;
    const next = form.description.trim() ? `${form.description.trim()}\n${line}` : line;
    if (next.length <= 1200) update('description', next);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.organizer.trim() || !form.venue.trim() || !form.district) return setError('Add the event name, organiser, venue and district.');
    if (!form.date || form.date < todayInIndia()) return setError('Choose today or a future date.');
    const hour = Number(form.timeHour);
    const minute = Number(form.timeMinute || '0');
    if (form.timeHour && (hour < 1 || hour > 12 || minute < 0 || minute > 59)) return setError('Enter a valid 12-hour time.');
    if (form.contactPhone && !/^[6-9]\d{9}$/.test(form.contactPhone)) return setError('Enter a valid 10-digit contact phone number.');
    setBusy(true);
    try {
      const image = imageMode === 'upload' && imageFile ? await uploadEditorialImage(imageFile) : imageMode === 'link' ? form.imageUrl.trim() : '';
      const hour24 = form.timeHour ? hour % 12 + (form.timePeriod === 'PM' ? 12 : 0) : 12;
      const date = new Date(`${form.date}T${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`).toISOString();
      const time = form.timeHour ? `${hour}:${String(minute).padStart(2, '0')} ${form.timePeriod}` : '';
      await createAdminEvent({ title: form.title.trim(), organizer: form.organizer.trim(), venue: form.venue.trim(), location: `${form.district}, Tamil Nadu`, date, time, category: form.category.trim(), sector: form.sector.trim(), specialty: form.specialty.trim(), description: form.description.trim(), contactPhone: form.contactPhone, registrationUrl: form.registrationUrl.trim(), image });
      onCreated();
    } catch (cause) { setError(cause.message || 'Could not publish the event.'); }
    finally { setBusy(false); }
  };

  return <section className="max-w-4xl text-[#11192f]">
    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#52705b]">Admin publishing</p>
    <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Create a happening</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6d62]">Add an event with the same details as the public event form. It goes live immediately. No video verification is required.</p>
    <form onSubmit={submit} className="mt-7 overflow-hidden rounded-[1.75rem] border border-[#d9e4d7] bg-[#fbfcfe] shadow-sm">
      <header className="bg-gradient-to-br from-[#11192f] via-[#172847] to-[#243c60] px-5 py-6 text-white sm:px-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ffe66d]">Hapzo360 community</p><h2 className="mt-2 text-2xl font-black tracking-tight">Add a new event</h2><p className="mt-1 text-sm text-white/75">Give people a reason to get together.</p></header>
      <div className="space-y-5 p-5 sm:p-8">
        <label className={fieldClass}>Event name<input required maxLength={100} placeholder="e.g. Weekend pottery workshop" className={inputClass} {...bind('title')} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className={fieldClass}>Organiser<input required maxLength={120} placeholder="Name shown on the event" className={inputClass} {...bind('organizer')} /></label><label className={fieldClass}>District<select required className={inputClass} {...bind('district')}><option value="">Select district</option>{DISTRICTS['Tamil Nadu'].map((district) => <option key={district} value={district}>{district}</option>)}</select></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className={fieldClass}>Date<input required type="date" min={todayInIndia()} inputMode="none" onKeyDown={(event) => { if (/^[0-9]$/.test(event.key) || ['Backspace', 'Delete'].includes(event.key)) event.preventDefault(); }} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} className={inputClass} {...bind('date')} /><span className="block text-xs font-normal text-[#11192f]/50">Choose today or a future date from the calendar.</span></label><div className={fieldClass}>Time <span className="font-normal text-[#11192f]/45">(optional)</span><div className="grid grid-cols-[1fr_auto_1fr_1.2fr] items-center gap-2"><input type="text" inputMode="numeric" maxLength={2} placeholder="hh" aria-label="Hour, 1 to 12" className={`${inputClass} min-w-0 text-center`} value={form.timeHour} onChange={(event) => update('timeHour', event.target.value.replace(/\D/g, '').slice(0, 2))} /><span className="font-bold text-[#11192f]/50">:</span><input type="text" inputMode="numeric" maxLength={2} placeholder="mm" aria-label="Minutes, 00 to 59" className={`${inputClass} min-w-0 text-center`} value={form.timeMinute} onChange={(event) => update('timeMinute', event.target.value.replace(/\D/g, '').slice(0, 2))} /><select aria-label="AM or PM" className={`${inputClass} min-w-0`} {...bind('timePeriod')}><option>AM</option><option>PM</option></select></div><span className="block text-xs font-normal text-[#11192f]/50">Enter a 12-hour time and select AM or PM.</span></div></div>
        <label className={fieldClass}>Venue<input required maxLength={120} placeholder="e.g. Town Hall, Tiruppur" className={inputClass} {...bind('venue')} /></label>
        <label className={fieldClass}>Contact phone <span className="font-normal text-[#11192f]/45">(optional)</span><input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit phone number" className={inputClass} value={form.contactPhone} onChange={(event) => update('contactPhone', event.target.value.replace(/\D/g, '').slice(0, 10))} /><span className="block text-xs font-normal text-[#11192f]/50">Shown to people who open the event details.</span></label>
        <label className={fieldClass}>Registration link <span className="font-normal text-[#11192f]/45">(optional)</span><input type="url" inputMode="url" maxLength={2048} placeholder="https://forms.example.com/your-event" className={inputClass} {...bind('registrationUrl')} /><span className="block text-xs font-normal text-[#11192f]/50">People can open this organiser form from the event details.</span></label>
        <div className="grid gap-4 sm:grid-cols-2"><SearchSelect id="admin-event-category" label="Category" options={categories} selected={form.category ? [form.category] : []} onSelect={(category) => update('category', category)} placeholder="Search or add a category" allowCustom customLabel={(value) => `+ Add "${value}" as a new category`} helperText="Search the list or type a new category and add it." /><SearchSelect id="admin-event-sector" label="Sector" options={sectors} selected={form.sector ? [form.sector] : []} onSelect={(sector) => setForm((current) => ({ ...current, sector, specialty: '' }))} placeholder="Search or add a sector" allowCustom customLabel={(value) => `+ Add "${value}" as a new sector`} helperText="Search the list or type a new sector and add it." /></div>
        <SearchSelect id="admin-event-specialty" label={`${form.sector} specialty or activity`} options={sectorSpecialties[form.sector] || []} selected={form.specialty ? [form.specialty] : []} onSelect={(specialty) => update('specialty', specialty)} placeholder={`Search or add a ${form.sector.toLowerCase()} activity`} allowCustom customLabel={(value) => `+ Add "${value}" as a new activity`} helperText={`Choose an activity within ${form.sector}, or type and add your own.`} />
        <div className="space-y-3"><div className="rounded-2xl border border-[#11192f]/10 bg-white p-4"><div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#526783]"><Sparkles size={14} /> Suggestions</div><p className="mt-1 text-xs font-normal text-[#11192f]/55">Tap a suggestion to add it to your details below.</p><div className="mt-3 flex flex-wrap gap-2">{suggestions.map((suggestion) => { const added = form.description.includes(`• ${suggestion}`); return <button key={suggestion} type="button" disabled={added || form.description.length + suggestion.length + 3 > 1200} onClick={() => addSuggestion(suggestion)} className="inline-flex items-center gap-1.5 rounded-2xl border border-[#11192f]/10 bg-[#fbfcfe] px-3 py-1.5 text-left text-xs font-medium hover:border-[#526783] disabled:opacity-50">{added ? <Check size={13} /> : '+'}{suggestion}</button>; })}</div></div><label className={fieldClass}><span className="flex justify-between">Event details <span className="text-xs font-normal text-[#11192f]/45">{form.description.length}/1200</span></span><textarea rows={4} maxLength={1200} placeholder="What will people experience at your event?" className={`${inputClass} resize-y leading-6`} {...bind('description')} /></label></div>
        <div className="rounded-2xl border border-[#11192f]/10 bg-white p-4"><p className="text-sm font-bold">Event image <span className="font-normal text-[#11192f]/45">(optional)</span></p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setImageMode('upload')} className={`rounded-full px-4 py-2 text-xs font-bold ${imageMode === 'upload' ? 'bg-[#11192f] text-white' : 'border border-[#11192f]/15'}`}>Upload image</button><button type="button" onClick={() => setImageMode('link')} className={`rounded-full px-4 py-2 text-xs font-bold ${imageMode === 'link' ? 'bg-[#11192f] text-white' : 'border border-[#11192f]/15'}`}>Image link</button></div>{imageMode === 'upload' ? <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} className="mt-3 block w-full rounded-xl border border-dashed border-[#11192f]/25 bg-white p-3 text-sm" /> : <input type="url" placeholder="https://example.com/event.jpg" className={`${inputClass} mt-3`} {...bind('imageUrl')} />}{(imageMode === 'upload' ? imagePreview : form.imageUrl.startsWith('https://') ? form.imageUrl : '') && <img src={imageMode === 'upload' ? imagePreview : form.imageUrl} alt="Event preview" className="mt-3 max-h-64 w-full rounded-xl object-cover" />}{imageMode === 'upload' && imageFile && <button type="button" onClick={() => setImageFile(null)} className="mt-2 text-xs font-bold text-[#315844] underline">Remove image</button>}</div>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>
      <footer className="flex flex-wrap justify-end gap-3 border-t border-[#11192f]/10 bg-[#fbfcfe] px-5 py-5 sm:px-8"><Link to="/super-admin/events" className="rounded-full border border-[#11192f]/15 bg-white px-6 py-3 text-sm font-bold">Cancel</Link><button type="submit" disabled={busy} className="rounded-full bg-[#11192f] px-6 py-3 text-sm font-bold text-white hover:bg-[#243c60] disabled:opacity-50">{busy ? 'Publishing…' : 'Publish event'}</button></footer>
    </form>
  </section>;
}
