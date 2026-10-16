// Company image if the job has one, otherwise the company's first letter.
export default function CompanyLogo({ job, size = 'h-14 w-14' }) {
  if (job.image) return <img src={job.image} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />;
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-xl bg-brand-50 text-xl font-extrabold text-brand-600`}>
      {job.companyName?.[0]?.toUpperCase()}
    </div>
  );
}
