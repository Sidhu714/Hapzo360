import { useEffect, useState } from 'react';
import { Clock3, LogIn, RefreshCw, Trash2 } from 'lucide-react';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import * as api from './openingsApiRemote';
import { JOB_REACTIVATION_FEE } from '../../config';
import HiringPipeline from './HiringPipeline';
import './post-job-theme.css';

const EXPIRED_JOB_STAGES = ['Expired', 'Review', 'Payment', 'Live'];

export default function ExpiredJobsPage() {
  const { company, openCompanyAuth, signOutCompany } = useCompanyAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadJobs = async (companyEmail) => {
    setJobs(await api.listExpiredCompanyJobs(companyEmail));
  };

  useEffect(() => {
    if (!company?.email) { setJobs([]); return; }
    let active = true;
    setLoading(true);
    api.listExpiredCompanyJobs(company.email).then((items) => { if (active) setJobs(items); })
      .catch((err) => { if (active) setError(err.message || 'Could not load expired jobs.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [company?.email]);

  const removeJob = async (job) => {
    if (!window.confirm(`Remove “${job.title}” permanently?`)) return;
    setBusyId(job.id);
    setError('');
    setNotice('');
    try {
      await api.removeExpiredCompanyJob(job.id, company.email);
      await loadJobs(company.email);
      setNotice('Expired job removed.');
    } catch (err) {
      setError(err.message || 'Unable to remove this job.');
    } finally {
      setBusyId('');
    }
  };

  const reactivateJob = async (job) => {
    setBusyId(job.id);
    setError('');
    setNotice('');
    try {
      const payment = await api.processJobReactivationPayment();
      await api.reactivateExpiredCompanyJob(job.id, company.email, payment);
      await loadJobs(company.email);
      setNotice(`${job.title} was submitted for approval. The demo reactivation payment was ₹${JOB_REACTIVATION_FEE}.`);
    } catch (err) {
      setError(err.message || 'Unable to reactivate this job.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="post-page expired-jobs-page">
    <div aria-hidden="true" className="post-opening-backdrop">
      <div className="post-opening-grid" />
      <div className="post-opening-blob post-opening-blob--a" />
      <div className="post-opening-blob post-opening-blob--b" />
    </div>
    <HiringPipeline stages={EXPIRED_JOB_STAGES} />
    <div className="page-shell relative z-10 py-8 md:py-11">
      <section className="page-hero px-6 py-8 md:px-10">
        <p className="page-kicker">Employer workspace</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Expired job listings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d0c7]">
          Expired listings are hidden from job seekers. Sign in to remove them or pay to make them live again.
        </p>
      </section>

      {!company ? (
        <div className="surface-card mx-auto mt-6 grid max-w-xl gap-4 p-5 md:p-7">
          <div>
            <h2 className="text-lg font-bold text-[#20372a]">Company sign in</h2>
            <p className="mt-1 text-sm text-stone-500">Use the email and password from your job posting account.</p>
          </div>
          <button type="button" onClick={() => openCompanyAuth('signin')} className="btn-primary w-full">
            <LogIn size={16} /> Sign in to view expired jobs
          </button>
        </div>
      ) : (
        <section className="surface-card mt-6 p-5 md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#20372a]">{company.companyName}</h2>
              <p className="text-sm text-stone-500">{company.email}</p>
            </div>
            <button className="btn-outline" onClick={signOutCompany}>
              Sign out
            </button>
          </div>

          {notice && <p role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {loading ? <p className="py-10 text-center text-sm text-stone-500">Loading expired jobs…</p> : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d9e2d1] bg-[#fafbf8] px-5 py-12 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-[#789078]" />
              <h3 className="mt-3 font-bold text-[#20372a]">No expired jobs</h3>
              <p className="mt-1 text-sm text-stone-500">Your expired listings will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-2xl border border-[#e3e8dc] bg-[#fafbf8] p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"><Clock3 size={13} />Expired</span>
                      <h3 className="mt-2 text-lg font-bold text-[#20372a]">{job.title}</h3>
                      <p className="mt-1 text-sm text-stone-500">{job.location} · Posted {new Date(job.createdAt).toLocaleDateString('en-IN')}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{job.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button className="btn-primary" disabled={busyId === job.id} onClick={() => reactivateJob(job)}>
                        <RefreshCw size={15} />{busyId === job.id ? 'Processing…' : `Pay ₹${JOB_REACTIVATION_FEE} to re-enable`}
                      </button>
                      <button className="btn-outline" disabled={busyId === job.id} onClick={() => removeJob(job)}>
                        <Trash2 size={15} />Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
    </div>
  );
}
