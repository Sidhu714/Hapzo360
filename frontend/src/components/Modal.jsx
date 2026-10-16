import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#142b21]/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`animate-pop card my-8 w-full rounded-[22px] border border-[#e3e8dc] bg-white p-6 shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-stone-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
