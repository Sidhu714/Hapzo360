// import { Banknote, MapPin } from 'lucide-react';
// import { useLanguage } from '../../context/LanguageContext';
// import { useTranslatedJob } from '../../hooks/useTranslatedJob';
// import CompanyLogo from '../../components/CompanyLogo';
// import JobTags from './JobTags';

// export default function JobCard({ job, onOpen, onApply }) {
//   const { t } = useLanguage();
//   const v = useTranslatedJob(job, ['title', 'location']);
//   return (
//     <article className="job-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
//       <CompanyLogo job={job} />
//       <div className="min-w-0 flex-1">
//         <h3 className="text-lg font-bold text-stone-900">{v.title}</h3>
//         <p className="text-sm text-stone-500">{job.companyName}</p>
//         <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
//           <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-stone-400" />{v.location}</span>
//           {job.salary && <span className="inline-flex items-center gap-1"><Banknote className="h-4 w-4 text-stone-400" />{job.salary}</span>}
//         </div>
//         <div className="mt-3"><JobTags job={job} /></div>
//       </div>
//       <div className="flex gap-2 sm:flex-col">
//         <button className="btn-primary flex-1" onClick={() => onApply(job)}>{t('openings.apply')}</button>
//         <button className="btn-outline flex-1" onClick={() => onOpen(job)}>{t('openings.view')}</button>
//       </div>
//     </article>
//   );
// }



import { Banknote, MapPin, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTranslatedJob } from '../../hooks/useTranslatedJob';
import CompanyLogo from '../../components/CompanyLogo';
import JobTags from './JobTags';

export default function JobCard({ job, onOpen, onApply }) {
  const { t } = useLanguage();
  const v = useTranslatedJob(job, ['title', 'location']);

  return (
    <article className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#e3e8dc] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#bdceb0] hover:shadow-lg hover:shadow-[#20372a]/[0.06] sm:p-6 ${job.image ? 'min-h-[520px] sm:min-h-[560px]' : 'min-h-[420px]'}`}>

      {job.image && <div className="-mx-5 -mt-5 mb-5 h-52 overflow-hidden bg-[#eef3e9] sm:-mx-6 sm:-mt-6 sm:mb-6 sm:h-56"><img src={job.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /></div>}

      {/* Company identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f0f4e9]">
          <CompanyLogo job={job} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold leading-5 text-stone-700">
            {job.companyName}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            {t('openings.view')}
          </p>
        </div>

        <ArrowUpRight
          size={18}
          className="shrink-0 text-stone-400 transition-colors group-hover:text-[#315844]"
        />
      </div>

      {/* Job title */}
      <div className="mt-5 min-w-0">
        <h3 className="break-words text-xl font-bold leading-snug tracking-tight text-[#20372a] [overflow-wrap:anywhere]">
          {v.title}
        </h3>
      </div>

      {/* Job information */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex min-w-0 items-start gap-2 text-sm text-stone-600">
          <MapPin
            size={16}
            className="mt-0.5 shrink-0 text-stone-400"
          />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {v.location}
          </span>
        </div>

        {job.salary && (
          <div className="flex min-w-0 items-start gap-2 text-sm font-medium text-[#315844]">
            <Banknote
              size={16}
              className="mt-0.5 shrink-0 text-stone-400"
            />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {job.salary}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="mt-5 min-w-0 flex-1 border-t border-[#edf0e8] pt-4">
        <div className="flex flex-wrap items-start gap-2">
          <JobTags job={job} />
        </div>
      </div>

      {/* Actions */}
      <div className={`mt-5 grid gap-2 ${onApply ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {onApply && (
          <button
            type="button"
            className="btn-primary flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 py-3 text-center text-sm font-semibold"
            onClick={() => onApply(job)}
          >
            {t('openings.apply')}
          </button>
        )}

        <button
          type="button"
          className="btn-outline flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 py-3 text-center text-sm font-semibold"
          onClick={() => onOpen(job)}
        >
          {t('openings.view')}
        </button>
      </div>
    </article>
  );
}
