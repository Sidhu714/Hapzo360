import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { JOB_TYPES } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import Loader from '../../components/Loader';
import JobCard from './JobCard';
import JobDetail from './JobDetail';
import * as api from './openingsApi';

export default function JobBoard() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { api.listJobs().then(setJobs); }, []);
  if (!jobs) return <Loader />;

  const needle = q.toLowerCase();
  const list = jobs.filter((j) => (!type || j.jobType === type) && (!q || `${j.title} ${j.location} ${j.companyName}`.toLowerCase().includes(needle)));

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input className="input pl-9" placeholder={t('openings.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t('openings.allTypes')}</option>
          {JOB_TYPES.map((x) => <option key={x} value={x}>{t(`type.${x}`)}</option>)}
        </select>
      </div>
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((j) => <JobCard key={j.id} job={j} onOpen={() => setSelected(j)} />)}
        </div>
      ) : <p className="card p-8 text-center text-stone-500">{t('openings.none')}</p>}
      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
