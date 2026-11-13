import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function AdminActionModal({ action, reason, onReasonChange, onClose, onConfirm, busy, error }) {
  const dialogRef = useRef(null);
  const reasonRef = useRef(null);
  const latest = useRef({ busy, onClose });
  latest.current = { busy, onClose };
  useEffect(() => {
    (action.decision === 'reject' ? reasonRef.current : dialogRef.current)?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape' && !latest.current.busy) latest.current.onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isDelete = action.type === 'delete' || action.type === 'delete-listing';
  const isStoryDelete = action.type === 'delete';
  const isReject = action.decision === 'reject';
  const verb = isDelete ? 'Delete' : isReject ? 'Reject' : 'Approve';
  const subject = isStoryDelete ? 'story' : action.kind === 'jobs' ? 'opening' : 'happening';

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#10231d]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="admin-action-title" aria-describedby="admin-action-description" className="w-full max-w-lg rounded-3xl border border-[#d9e4d7] bg-white p-6 text-[#19342a] shadow-2xl outline-none sm:p-8">
      <div className="flex items-start justify-between gap-4"><span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${isDelete || isReject ? 'bg-red-50 text-[#a43732]' : 'bg-[#e3f1df] text-[#315844]'}`}>{subject}</span><button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog" className="rounded-lg p-2 text-[#6b786e] hover:bg-[#eef3e9]"><X size={20} /></button></div>
      <h2 id="admin-action-title" className="mt-5 text-2xl font-extrabold">{verb} this {subject}?</h2>
      <p id="admin-action-description" className="mt-3 text-sm leading-6 text-[#5d6d62]"><strong className="text-[#19342a]">{action.item.title}</strong>{isStoryDelete ? ' will be removed from the public feed and cannot be restored.' : action.type === 'delete-listing' ? ' will be removed from public listings and the admin list. Existing applications or registrations remain in the records.' : isReject ? ' will stay hidden. The company will see your reason in its record.' : ' will become visible to visitors after approval.'}</p>
      {isReject && <label className="mt-5 grid gap-2 text-sm font-bold">Reason for rejection <span className="font-normal text-[#6b786e]">(required)</span><textarea ref={reasonRef} required maxLength={500} rows={4} value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Explain what needs to change…" className="rounded-xl border border-[#cbd9ca] p-3 font-normal outline-none focus:border-[#315844]" /></label>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-[#a43732]">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-[#cbd9ca] px-5 py-3 text-sm font-bold hover:bg-[#eef3e9]">Cancel</button><button type="button" onClick={onConfirm} disabled={busy || (isReject && !reason.trim())} className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-50 ${isDelete || isReject ? 'bg-[#a43732] hover:bg-[#8d2b27]' : 'bg-[#315844] hover:bg-[#244535]'}`}>{busy ? 'Working…' : `${verb} ${subject}`}</button></div>
    </div>
  </div>;
}
