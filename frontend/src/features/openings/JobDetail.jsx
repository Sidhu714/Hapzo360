import { useLanguage } from '../../context/LanguageContext';
import { useTranslatedJob } from '../../hooks/useTranslatedJob';
import Modal from '../../components/Modal';
import CompanyLogo from '../../components/CompanyLogo';
import JobTags from './JobTags';

function Row({ label, children }) {
  return children ? <div><dt className="text-xs font-medium text-stone-500">{label}</dt><dd className="mt-0.5 text-sm font-semibold text-stone-800">{children}</dd></div> : null;
}

export default function JobDetail({ job, onClose, onApply }) {
  const { t, lang } = useLanguage();
  // Older listings included a `Contact:` sentence in the public description.
  // Remove it before translation as well as display so it cannot leak there.
  const publicJob = {
    ...job,
    description: (job.description || '').replace(/(?:^|\s)Contact:\s*[^.]*\.?/gi, ' ').trim(),
  };
  const v = useTranslatedJob(publicJob);
  return (
    <Modal wide title={v.title} onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <CompanyLogo job={job} size="h-12 w-12" />
        <div><p className="font-semibold text-stone-900">{job.companyName}</p><p className="text-sm text-stone-500">{v.location}</p></div>
      </div>
      <JobTags job={job} />
      <dl className="my-5 grid gap-4 rounded-xl bg-stone-50 p-4 sm:grid-cols-3">
        <Row label={t('openings.salary')}>{job.salary}</Row>
        <Row label={t('openings.experience')}>{job.experience}</Row>
        <Row label={t('openings.posted')}>{new Date(job.createdAt).toLocaleDateString(`${lang}-IN`, { day: 'numeric', month: 'short', year: 'numeric' })}</Row>
      </dl>
      <h4 className="font-bold text-stone-900">{t('openings.description')}</h4>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-700">{v.description}</p>
      <h4 className="mt-5 font-bold text-stone-900">{t('openings.requirements')}</h4>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-700">{v.requirements}</p>
      <button className="btn-primary mt-6 w-full sm:w-auto" onClick={() => onApply(job)}>{t('openings.apply')}</button>
    </Modal>
  );
}
