import { CalendarDays } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const DATES = [['day', 'filters.pastDay'], ['week', 'filters.pastWeek'], ['month', 'filters.pastMonth'], ['all', 'filters.all']];

function Group({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[20px] border border-[#e3e8dc] bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-3 text-base font-bold tracking-tight text-[#20372a]"><Icon className="h-7 w-7" strokeWidth={1.6} />{title}</h3>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function Option({ type, checked, onChange, label, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[15px] text-stone-800">
      <input type={type} name={type === 'radio' ? 'date' : undefined} className={type === 'radio' ? 'radio' : 'check'} checked={checked} onChange={onChange} />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-sm text-stone-400">{count}</span>}
    </label>
  );
}

export default function FilterSidebar({ filters, onChange, onClear }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-stone-900">{t('filters.title')}</h2>
        <button onClick={onClear} className="text-sm font-bold text-[#315844] hover:underline">{t('filters.clear')}</button>
      </div>

      <Group icon={CalendarDays} title={t('filters.date')}>
        {DATES.map(([v, k]) => <Option key={v} type="radio" label={t(k)} checked={filters.date === v} onChange={() => onChange({ ...filters, date: v })} />)}
      </Group>

    </div>
  );
}
