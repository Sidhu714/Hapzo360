import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SERVICES } from '../features/registry';

// Each card opens that service on its own page: /services/<slug>
export default function ServiceGrid() {
  const { t } = useLanguage();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {SERVICES.map((s, i) => (
        <Link key={s.slug} to={`/services/${s.slug}`}
          className={`group flex min-h-[230px] flex-col rounded-[20px] border border-[#e3e8dc] bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#c7d7b3] hover:shadow-xl hover:shadow-[#243b2b0d]`}>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf1df] text-[#315844]"><s.icon className="h-6 w-6" /></div>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-[#20372a]">{t(`svc.${s.slug}`)}</h3>
          <p className="mt-1 flex-1 text-sm leading-6 text-stone-500">{t(`svc.${s.slug}.desc`)}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#315844]">
            {t('common.readMore')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}
