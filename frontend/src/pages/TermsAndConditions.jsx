import { Link } from 'react-router-dom';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, Compass } from 'lucide-react';

const terms = [
  {
    title: 'Using Hapzo360',
    body: 'Use Hapzo360 lawfully and provide accurate information when you create an account, publish content, or use a platform feature. Do not misuse the site, interfere with its operation, or attempt to access another person’s account or information.',
  },
  {
    title: 'Openings: employers and job listings',
    body: 'Employers must be authorised to post each role and keep its title, location, requirements, pay details, contact information, and status accurate. Employers are responsible for their hiring decisions and for complying with applicable employment rules. A listing may be hidden when its posting period ends.',
  },
  {
    title: 'Openings: job seekers and applications',
    body: 'Job seekers should submit truthful application details and only apply for roles they are interested in. Application information is provided to the relevant employer for recruitment. Hapzo360 does not promise an interview, offer, or employment outcome.',
  },
  {
    title: 'Happenings: community events',
    body: 'Event submitters must be authorised to share the event and provide accurate dates, times, venues, and descriptions. Submitters are responsible for organising the event, obtaining permissions, and communicating changes or cancellations. Hapzo360 lists events but does not organise or guarantee them.',
  },
  {
    title: 'Content, images, and contact details',
    body: 'Only share text, images, and contact details you have permission to use. Contact information may be shown to other users as part of a listing or application flow; do not submit a phone number or email address you are not comfortable sharing for that purpose. Do not post unlawful, deceptive, abusive, discriminatory, or unsafe content.',
  },
  {
    title: 'Information from other sources',
    body: 'Some trends, market prices, technology updates, and event details may come from third-party sources. Information can change or contain errors; verify important details with the original publisher or organiser. A listing or article is not an endorsement by Hapzo360.',
  },
  {
    title: 'Review and removal',
    body: 'Hapzo360 may review, decline, edit for clarity, hide, or remove content that appears inaccurate, outdated, inappropriate, or inconsistent with these terms. Users remain responsible for the content and decisions they submit or make.',
  },
  {
    title: 'Changes to these terms',
    body: 'These terms may be updated as Hapzo360 changes. The version shown on this page applies when you use a feature or submit information.',
  },
];

export default function TermsAndConditions() {
  return (
    <div className="page-shell py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#315844] transition hover:text-[#20372a]">
          <ArrowLeft size={16} /> Back to Hapzo360
        </Link>

        <header className="mt-8 rounded-[28px] bg-[#11192f] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#ffe66d]">
              <Compass size={14} /> Hapzo360 platform
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/85">
              <BriefcaseBusiness size={14} /> Openings
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/85">
              <CalendarDays size={14} /> Happenings
            </div>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Terms &amp; Conditions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
            These terms apply across Hapzo360, including Openings, Happenings, and other platform features.
          </p>
        </header>

        <section className="mt-6 rounded-[24px] border border-[#11192f]/10 bg-white p-6 sm:p-9">
          <p className="mb-7 text-sm leading-6 text-[#11192f]/65">
            By using Hapzo360 or submitting information through it, you agree to the conditions below. Additional notices may appear where a particular feature needs them.
          </p>
          <div className="space-y-6">
            {terms.map((term, index) => (
              <article key={term.title} className="border-t border-[#11192f]/10 pt-5 first:border-0 first:pt-0">
                <h2 className="text-base font-extrabold text-[#11192f]">
                  <span className="mr-2 text-[#315844]">{String(index + 1).padStart(2, '0')}</span>
                  {term.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#11192f]/65">{term.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
