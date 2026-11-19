import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const RESTORE_EXPIRY_OPTIONS = [
  { value: '1', label: '1 day' }, { value: '3', label: '3 days' }, { value: '7', label: '7 days' },
  { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '60', label: '60 days' },
  { value: '90', label: '90 days' }, { value: 'custom', label: 'Choose exact date & time' },
];
const localDateTime = (value = new Date(Date.now() + 3_600_000)) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function AdminActionModal({ action, reason, onReasonChange, onClose, onConfirm, busy, error }) {
  const dialogRef = useRef(null);
  const reasonRef = useRef(null);
  const latest = useRef({ busy, onClose });
  const [restoreExpiryChoice, setRestoreExpiryChoice] = useState('3');
  const [customRestoreExpiryAt, setCustomRestoreExpiryAt] = useState(() => localDateTime());
  latest.current = { busy, onClose };
  useEffect(() => {
    (action.decision === 'reject' ? reasonRef.current : dialogRef.current)?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape' && !latest.current.busy) latest.current.onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isDelete = action.type === 'delete' || action.type === 'delete-listing' || action.type === 'delete-person' || action.type === 'delete-company';
  const isRestore = action.type === 'restore-listing';
  const isStoryDelete = action.type === 'delete';
  const isPersonDelete = action.type === 'delete-person';
  const isCompanyDelete = action.type === 'delete-company';
  const isReject = action.decision === 'reject';
  const verb = isRestore ? 'Restore & publish' : isDelete ? 'Delete' : isReject ? 'Reject' : 'Approve';
  const subject = isStoryDelete ? 'story' : isPersonDelete ? 'person' : isCompanyDelete ? 'company' : action.kind === 'jobs' ? 'opening' : 'happening';
  const confirm = () => {
    if (!isRestore) return onConfirm();
    if (restoreExpiryChoice === 'custom') {
      const date = new Date(customRestoreExpiryAt);
      if (!customRestoreExpiryAt || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now() + 60_000) return;
      return onConfirm({ expiryDays: 3, expiresAt: date.toISOString() });
    }
    return onConfirm({ expiryDays: Number(restoreExpiryChoice) });
  };
  const customExpiryInvalid = isRestore && restoreExpiryChoice === 'custom' && (!customRestoreExpiryAt || !Number.isFinite(new Date(customRestoreExpiryAt).getTime()) || new Date(customRestoreExpiryAt).getTime() <= Date.now() + 60_000);

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#10231d]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="admin-action-title" aria-describedby="admin-action-description" className="w-full max-w-lg rounded-3xl border border-[#d9e4d7] bg-white p-6 text-[#19342a] shadow-2xl outline-none sm:p-8">
      <div className="flex items-start justify-between gap-4"><span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${isDelete || isReject ? 'bg-red-50 text-[#a43732]' : 'bg-[#e3f1df] text-[#315844]'}`}>{subject}</span><button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog" className="rounded-lg p-2 text-[#6b786e] hover:bg-[#eef3e9]"><X size={20} /></button></div>
      <h2 id="admin-action-title" className="mt-5 text-2xl font-extrabold">{verb} this {subject}?</h2>
      <p id="admin-action-description" className="mt-3 text-sm leading-6 text-[#5d6d62]"><strong className="text-[#19342a]">{isPersonDelete ? action.item.name : isCompanyDelete ? action.item.companyName : action.item.title}</strong>{isRestore ? ' will be visible on the public openings page again. Choose when it should automatically disappear.' : isStoryDelete ? ' will be removed from the public feed and cannot be restored.' : isPersonDelete ? ' and their active sessions, applications, and event registrations will be permanently removed.' : isCompanyDelete ? ' and its active sessions will be permanently removed. Its openings and happenings will be removed from public listings.' : action.type === 'delete-listing' ? ' will be removed from public listings and the admin list. Existing applications or registrations remain in the records.' : isReject ? ' will stay hidden. The company will see your reason in its record.' : ' will become visible to visitors after approval.'}</p>
      {isRestore && <section className="mt-5 rounded-2xl border border-[#d9e4d7] bg-[#f8fbf6] p-4"><h3 className="text-sm font-extrabold">Listing expiry *</h3><p className="mt-1 text-xs leading-5 text-[#5d6d62]">This opening is hidden from public listings automatically at the time you select.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold">Hide opening after<select value={restoreExpiryChoice} onChange={(event) => setRestoreExpiryChoice(event.target.value)} className="rounded-xl border border-[#cbd9ca] bg-white px-3 py-2.5 font-normal">{RESTORE_EXPIRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{restoreExpiryChoice === 'custom' && <label className="grid gap-1.5 text-sm font-bold">Exact expiry date &amp; time<input required type="datetime-local" min={localDateTime(new Date(Date.now() + 120_000))} value={customRestoreExpiryAt} onChange={(event) => setCustomRestoreExpiryAt(event.target.value)} className="rounded-xl border border-[#cbd9ca] bg-white px-3 py-2.5 font-normal" /></label>}</div>{customExpiryInvalid && <p className="mt-3 text-xs font-semibold text-[#a43732]">Choose a future expiry date and time.</p>}</section>}
      {isReject && <label className="mt-5 grid gap-2 text-sm font-bold">Reason for rejection <span className="font-normal text-[#6b786e]">(required)</span><textarea ref={reasonRef} required maxLength={500} rows={4} value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Explain what needs to change…" className="rounded-xl border border-[#cbd9ca] p-3 font-normal outline-none focus:border-[#315844]" /></label>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-[#a43732]">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-[#cbd9ca] px-5 py-3 text-sm font-bold hover:bg-[#eef3e9]">Cancel</button><button type="button" onClick={confirm} disabled={busy || customExpiryInvalid || (isReject && !reason.trim())} className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-50 ${isDelete || isReject ? 'bg-[#a43732] hover:bg-[#8d2b27]' : 'bg-[#315844] hover:bg-[#244535]'}`}>{busy ? 'Working…' : `${verb} ${subject}`}</button></div>
    </div>
  </div>;
}
