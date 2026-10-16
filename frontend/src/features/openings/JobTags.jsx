import { useLanguage } from '../../context/LanguageContext';

export default function JobTags({ job }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-2">
      <span className="tag-brand">{t(`type.${job.jobType}`)}</span>
      {job.category && <span className="tag">{t(`cat.${job.category}`)}</span>}
      {job.gender && job.gender !== 'any' && <span className="tag">{t(`gender.${job.gender}`)}</span>}
    </div>
  );
}
