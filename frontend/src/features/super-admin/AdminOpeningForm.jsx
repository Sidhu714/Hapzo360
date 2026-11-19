import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Plus, X } from 'lucide-react';
import { STATES, DISTRICTS } from '../../data/indiaLocations';
import SearchSelect from '../openings/SearchSelect';
import { createAdminJob, uploadEditorialImage } from './adminApi';

const POSITION_OPTIONS = [
  'Accountant', 'Accountant Assistant', 'Admin Executive', 'Back Office Executive',
  'Business Development Executive', 'Cashier', 'Customer Support Executive',
  'Data Entry Operator', 'Delivery Executive', 'Driver', 'Electrician',
  'Field Sales Executive', 'HR Executive', 'Machine Operator', 'Office Assistant',
  'Production Operator', 'Quality Inspector', 'Receptionist', 'Sales Executive',
  'Security Guard', 'Software Developer', 'Store Keeper', 'Supervisor',
  'Technician', 'Warehouse Assistant', 'Welder',
];
const EXPERIENCE_OPTIONS = ['Fresher', ...Array.from({ length: 20 }, (_, index) => `${index + 1}+ years`)];
const newPosition = () => ({ id: crypto.randomUUID(), title: '', experiences: [], contactName: '', contactPhone: '', remarks: '', remarksEdited: false });
const salaryWithRupee = (value) => { const salary = value.trim(); return salary && !salary.includes('₹') ? `₹${salary}` : salary; };
const peopleLabel = (count) => `${count} ${Number(count) === 1 ? 'person' : 'people'}`;
const levelLine = (level) => `${level.level}: ${peopleLabel(level.count)}${level.salary ? ` (Salary: ${level.salary})` : ''}`;
const remarksFor = (position) => `Hiring for ${position.title.trim() || 'this position'}.${position.experiences.length ? ` Experience requirements: ${position.experiences.map(levelLine).join(', ')}.` : ''}`;
const salaryFor = (position) => {
  const paid = position.experiences.filter((level) => level.salary);
  if (!paid.length) return '';
  const unique = [...new Set(paid.map((level) => level.salary))];
  return unique.length === 1 && paid.length === position.experiences.length
    ? unique[0] : paid.map((level) => `${level.level}: ${level.salary}`).join(' | ');
};
const inputClass = 'w-full rounded-xl border border-[#dfe7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10';
const EXPIRY_OPTIONS = [
  { value: '1', label: '1 day' }, { value: '3', label: '3 days' }, { value: '7', label: '7 days' },
  { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '60', label: '60 days' },
  { value: '90', label: '90 days' }, { value: 'custom', label: 'Choose exact date & time' },
];
const localDateTime = (value = new Date(Date.now() + 3_600_000)) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function AdminOpeningForm({ onCreated }) {
  const [companyName, setCompanyName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [positions, setPositions] = useState([newPosition()]);
  const [imageMode, setImageMode] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [expiryChoice, setExpiryChoice] = useState('3');
  const [customExpiryAt, setCustomExpiryAt] = useState(() => localDateTime());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updatePosition = (id, changes) => setPositions((current) => current.map((position) => {
    if (position.id !== id) return position;
    const updated = { ...position, ...(typeof changes === 'function' ? changes(position) : changes) };
    return updated.remarksEdited ? updated : { ...updated, remarks: remarksFor(updated) };
  }));
  const toggleExperience = (id, level) => updatePosition(id, (position) => ({
    experiences: position.experiences.some((item) => item.level === level)
      ? position.experiences.filter((item) => item.level !== level)
      : [...position.experiences, { level, count: 1, salary: '' }].sort((a, b) => EXPERIENCE_OPTIONS.indexOf(a.level) - EXPERIENCE_OPTIONS.indexOf(b.level)),
  }));
  const updateLevel = (id, level, changes) => updatePosition(id, (position) => ({
    experiences: position.experiences.map((item) => item.level === level ? { ...item, ...changes } : item),
  }));
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
      setImageFile(null);
      setError('Choose a JPEG, PNG or WebP image under 5 MB.');
      return;
    }
    setImageFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!companyName.trim()) return setError('Enter the company or organisation name.');
    if (!state || !district) return setError('Select a state and district.');
    for (const [index, position] of positions.entries()) {
      const label = `Position ${index + 1}`;
      if (!position.title.trim()) return setError(`${label}: select a job title.`);
      if (!position.experiences.length) return setError(`${label}: select at least one experience level.`);
      if (position.experiences.some((level) => !Number.isInteger(Number(level.count)) || Number(level.count) < 1)) return setError(`${label}: enter a valid headcount.`);
      if (!position.contactName.trim()) return setError(`${label}: enter a contact person.`);
      if (!/^[6-9]\d{9}$/.test(position.contactPhone.replace(/\D/g, ''))) return setError(`${label}: enter a valid 10-digit contact number.`);
    }
    const jobs = positions.map((position) => {
      const experiences = position.experiences.map((level) => ({ ...level, count: Number(level.count), salary: salaryWithRupee(level.salary) }));
      const saved = { ...position, title: position.title.trim(), contactName: position.contactName.trim(), contactPhone: position.contactPhone.replace(/\D/g, ''), experiences };
      const description = position.remarksEdited ? position.remarks.trim() : remarksFor(saved);
      return {
        title: saved.title, experience: experiences.map((level) => level.level).join(', '),
        salary: salaryFor(saved), description, requirements: `${saved.title}: ${experiences.map(levelLine).join(', ')}`,
        positions: [{ title: saved.title, experiences, remarks: description, contactName: saved.contactName, contactPhone: saved.contactPhone }],
      };
    });
    if (jobs.some((job) => !job.description)) return setError('Add remarks for each position.');
    let expiresAt = '';
    if (expiryChoice === 'custom') {
      const date = new Date(customExpiryAt);
      if (!customExpiryAt || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now() + 60_000) return setError('Choose a future date and time for this opening to expire.');
      expiresAt = date.toISOString();
    }
    setBusy(true);
    try {
      const image = imageMode === 'upload' && imageFile ? await uploadEditorialImage(imageFile) : imageMode === 'link' ? imageUrl.trim() : '';
      await createAdminJob({ companyName: companyName.trim(), location: `${district}, ${state}`, jobs, image, expiryDays: expiryChoice === 'custom' ? 3 : Number(expiryChoice), ...(expiresAt ? { expiresAt } : {}) });
      onCreated();
    } catch (cause) { setError(cause.message || 'Could not publish the openings.'); }
    finally { setBusy(false); }
  };

  return <section className="max-w-5xl">
    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#52705b]">Admin publishing</p>
    <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Create openings</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6d62]">Use the same hiring details as Post a Job. Each position becomes a separate opening and stays public until the expiry you choose. No payment is required.</p>
    <form onSubmit={submit} noValidate className="mt-7 rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-7 flex items-center gap-3"><span className="rounded-xl bg-[#eef3e9] p-3 text-[#315844]"><BriefcaseBusiness size={20} /></span><div><h2 className="text-xl font-extrabold">Job details</h2><p className="text-sm text-[#6b786e]">Add each position you are hiring for.</p></div></div>
      <label className="mb-5 block text-sm font-bold text-[#284436]">Company or organisation *<input required maxLength={120} value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Name shown on each opening" className={`${inputClass} mt-2`} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <SearchSelect id="admin-job-state" label="Location - State *" options={STATES} selected={state ? [state] : []} onSelect={(value) => { setState(value); setDistrict(''); }} placeholder="Select state" />
        <SearchSelect id="admin-job-district" label="District *" options={DISTRICTS[state] || []} selected={district ? [district] : []} onSelect={setDistrict} placeholder={state ? 'Select or type district' : 'Select a state first'} disabled={!state} allowCustom customLabel={(value) => `Use "${value}"`} />
      </div>
      <section className="mt-6 rounded-2xl border border-[#e1e8dc] bg-[#fbfcf9] p-4 sm:p-5">
        <h3 className="text-base font-extrabold text-[#20372a]">Opening image <span className="font-normal text-sm text-[#65736a]">(optional)</span></h3>
        <p className="mt-1 text-sm leading-6 text-[#65736a]">The same image is used for every position in this opening.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Opening image source"><button type="button" onClick={() => setImageMode('upload')} className={`rounded-full px-4 py-2 text-xs font-bold ${imageMode === 'upload' ? 'bg-[#315844] text-white' : 'border border-[#b9cdb0] bg-white text-[#315844]'}`}>Upload image</button><button type="button" onClick={() => setImageMode('link')} className={`rounded-full px-4 py-2 text-xs font-bold ${imageMode === 'link' ? 'bg-[#315844] text-white' : 'border border-[#b9cdb0] bg-white text-[#315844]'}`}>Image link</button></div>
        {imageMode === 'upload' ? <><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} className="mt-3 block w-full rounded-xl border border-dashed border-[#b9cdb0] bg-white p-3 text-sm" /><p className="mt-2 text-xs text-[#65736a]">JPEG, PNG or WebP · maximum 5 MB</p>{imagePreview && <img src={imagePreview} alt="Opening preview" className="mt-3 h-40 w-full rounded-xl border border-[#d9e4d7] object-cover sm:h-52" />}{imageFile && <button type="button" onClick={() => setImageFile(null)} className="mt-2 text-xs font-bold text-[#315844] underline">Remove selected image</button>}</> : <><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/opening.jpg" className={`${inputClass} mt-3`} />{imageUrl.startsWith('https://') && <img src={imageUrl} alt="Opening preview" className="mt-3 h-40 w-full rounded-xl border border-[#d9e4d7] object-cover sm:h-52" />}</>}
      </section>
      <section className="mt-6 rounded-2xl border border-[#e1e8dc] bg-[#fbfcf9] p-4 sm:p-5">
        <h3 className="text-base font-extrabold text-[#20372a]">Listing expiry</h3>
        <p className="mt-1 text-sm leading-6 text-[#65736a]">The opening is automatically hidden from the public page at the selected time. It stays in Admin Openings, where you can restore it later.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#284436]">Hide opening after<select value={expiryChoice} onChange={(event) => setExpiryChoice(event.target.value)} className={`${inputClass} mt-2`}>{EXPIRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {expiryChoice === 'custom' && <label className="text-sm font-semibold text-[#284436]">Exact expiry date &amp; time<input required type="datetime-local" min={localDateTime(new Date(Date.now() + 120_000))} value={customExpiryAt} onChange={(event) => setCustomExpiryAt(event.target.value)} className={`${inputClass} mt-2`} /></label>}
        </div>
      </section>
      <div className="mt-6 space-y-6">{positions.map((position, index) => <section key={position.id} className="rounded-2xl border border-[#e1e8dc] bg-[#fbfcf9] p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#789078]">POSITION {String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 text-lg font-bold text-[#20372a]">Hiring requirements</h3></div>{positions.length > 1 && <button type="button" onClick={() => setPositions((current) => current.filter((item) => item.id !== position.id))} aria-label={`Remove position ${index + 1}`} className="rounded-full border border-red-200 p-2 text-red-600 hover:bg-red-50"><X size={16} /></button>}</div>
        <div className="grid gap-5 md:grid-cols-2">
          <SearchSelect id={`admin-position-${position.id}`} label="Position" options={POSITION_OPTIONS} selected={position.title ? [position.title] : []} onSelect={(title) => updatePosition(position.id, { title })} placeholder="Search or select a job position" allowCustom customLabel={(value) => `+ Add "${value}" as a new position`} />
          <SearchSelect id={`admin-experience-${position.id}`} label="Experience required" options={EXPERIENCE_OPTIONS} selected={position.experiences.map((level) => level.level)} onSelect={(level) => toggleExperience(position.id, level)} placeholder="Search or select experience levels" multiple closeOnSelect />
        </div>
        {position.experiences.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-2">{position.experiences.map((level) => <div key={level.level} className="rounded-xl border border-[#e4eadf] bg-white p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold text-[#294333]">{level.level}</span><button type="button" onClick={() => toggleExperience(position.id, level.level)} aria-label={`Remove ${level.level}`} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"><X size={15} /></button></div><div className="grid gap-3 sm:grid-cols-[8rem_1fr]"><label className="text-xs text-stone-500">People needed<input type="number" min="1" step="1" value={level.count} onChange={(event) => updateLevel(position.id, level.level, { count: event.target.value })} className={`${inputClass} mt-1.5 px-3 py-2.5`} /></label><label className="text-xs text-stone-500">Salary for {level.level}<input value={level.salary} onChange={(event) => updateLevel(position.id, level.level, { salary: event.target.value })} placeholder="e.g. ₹15,000/month" className={`${inputClass} mt-1.5 px-3 py-2.5`} /></label></div></div>)}</div>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-[#284436]">Contact person name *<input value={position.contactName} onChange={(event) => updatePosition(position.id, { contactName: event.target.value })} placeholder="e.g. Ramesh Kumar" className={`${inputClass} mt-2`} /></label><label className="text-sm font-semibold text-[#284436]">Contact phone number *<input type="tel" inputMode="tel" value={position.contactPhone} onChange={(event) => updatePosition(position.id, { contactPhone: event.target.value.replace(/[^\d+\-\s]/g, '') })} placeholder="e.g. 98765 43210" className={`${inputClass} mt-2`} /></label></div>
        <div className="mt-6"><div className="mb-2 flex items-center justify-between gap-2"><label htmlFor={`admin-remarks-${position.id}`} className="text-sm font-semibold text-[#284436]">Remarks</label><span className="text-[11px] font-medium text-[#789078]">Auto-generated · Editable</span></div><textarea id={`admin-remarks-${position.id}`} rows={4} value={position.remarks} onChange={(event) => updatePosition(position.id, { remarks: event.target.value, remarksEdited: true })} placeholder="Additional requirements or details..." className={`${inputClass} resize-y leading-6`} /><p className="mt-2 text-xs text-stone-500">Remarks are generated from the position, experience, headcount and salary. Edit them freely.</p></div>
      </section>)}</div>
      <button type="button" onClick={() => setPositions((current) => [...current, newPosition()])} disabled={positions.length >= 10} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#b9cdb0] bg-[#f4f7ef] px-5 py-4 text-sm font-bold text-[#315844] hover:bg-[#eaf1df] disabled:opacity-50"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#315844] text-white"><Plus size={17} /></span>Add another position</button>
      <p className="mt-4 text-xs text-[#718475]">Contact details are shown only after a person applies.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-[#a43732]">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#e4ebe0] pt-5"><Link to="/super-admin/jobs" className="rounded-xl border border-[#cbd9ca] px-5 py-3 text-sm font-bold text-[#315844]">Cancel</Link><button type="submit" disabled={busy} className="rounded-xl bg-[#315844] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Publishing…' : `Publish ${positions.length === 1 ? 'opening' : `${positions.length} openings`}`}</button></div>
    </form>
  </section>;
}
