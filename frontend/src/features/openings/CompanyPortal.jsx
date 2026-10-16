import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, Plus } from 'lucide-react';
import Loader from '../../components/Loader';
import CompanyAuth from './CompanyAuth';
import PaymentModal from './PaymentModal';
import JobForm from './JobForm';
import * as api from './openingsApi';

export default function CompanyPortal() {
  const [company, setCompany] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { api.getSessionCompany().then((c) => { setCompany(c); setReady(true); }); }, []);

  if (!ready) return <Loader />;
  if (!company) return <CompanyAuth onAuth={setCompany} />;
  return <Dashboard company={company} onChange={setCompany} onLogout={() => { api.logoutCompany(); setCompany(null); }} />;
}

function Dashboard({ company, onChange, onLogout }) {
  const [jobs, setJobs] = useState([]);
  const [step, setStep] = useState(null); // null | 'pay' | 'form'
  const [notice, setNotice] = useState('');
  const fee = api.getPostingFee(company);

  const reload = () => Promise.all([api.listCompanyJobs(company.id), api.getSessionCompany()]).then(([j, c]) => { setJobs(j); onChange(c); });
  useEffect(() => { api.listCompanyJobs(company.id).then(setJobs); }, [company.id]);

  // Already paid but not yet posted? Go straight to the form.
  const start = async () => setStep((await api.hasPaidCredit(company.id)) ? 'form' : 'pay');
  const post = async (data) => {
    await api.createJob(company.id, data);
    setStep(null);
    setNotice('Job posted. Job seekers can see it now.');
    reload();
  };

  return (
    <div className="space-y-6"><section className="page-hero px-6 py-8 md:px-10"><p className="page-kicker">Employer workspace</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Good to see you again.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#c5d0c7]">Manage your listings and get your next role in front of the right people.</p></section>
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{company.companyName}</h2>
          <p className="text-sm text-stone-500">{company.email} · {company.location}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={start}><Plus className="h-4 w-4" /> Post a Job (₹{fee})</button>
          <button className="btn-outline" onClick={onLogout}><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </div>

      {notice && <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}

      <div className="surface-card p-5 md:p-6">
        <h3 className="font-semibold text-stone-900">Your job posts</h3>
        {jobs.length === 0 ? <p className="mt-2 text-sm text-stone-500">You have not posted any jobs yet.</p> : (
          <ul className="mt-3 divide-y divide-stone-100">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-stone-800">{j.title}</span>
                <span className="text-stone-500">{j.location} · {new Date(j.createdAt).toLocaleDateString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {step === 'pay' && <PaymentModal company={company} onPaid={() => setStep('form')} onClose={() => setStep(null)} />}
      {step === 'form' && <JobForm onSubmit={post} onClose={() => setStep(null)} />}
    </div>
  );
}
