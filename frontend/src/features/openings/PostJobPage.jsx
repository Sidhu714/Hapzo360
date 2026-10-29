import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check, CheckCircle2,
  ChevronDown, CreditCard, Eye, EyeOff, Mail, Plus, Share2, ShieldCheck, Sparkles, X,
} from 'lucide-react';

import { DEFAULT_JOB_EXPIRY_DAYS, PRICING } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import Field from '../../components/Field';
import { STATES, DISTRICTS } from '../../data/indiaLocations';
import * as api from './openingsApi';
import SearchSelect from './SearchSelect';
import HiringPipeline from './HiringPipeline';
import './post-job-theme.css';

const POSTING_STAGES = ['Company', 'Job details', 'Payment', 'Publish'];

const EMPTY_JOB = {
  title: '',
  jobType: 'full-time',
  gender: 'any',
  category: 'other',
  location: '',
  salary: '',
  experience: '',
  description: '',
  requirements: '',
  image: '',
  positions: [],
  expiryDays: DEFAULT_JOB_EXPIRY_DAYS,
};

const EMPTY_CO = {
  companyName: '',
  contactPerson: '',
  contactDesignation: '',
  additionalContactPerson: '',
  additionalContactDesignation: '',
  phone: '',
  email: '',
  location: '',
  industry: '',
  website: '',
};

const POSITION_OPTIONS = [
  'Accountant',
  'Accountant Assistant',
  'Admin Executive',
  'Back Office Executive',
  'Business Development Executive',
  'Cashier',
  'Customer Support Executive',
  'Data Entry Operator',
  'Delivery Executive',
  'Driver',
  'Electrician',
  'Field Sales Executive',
  'HR Executive',
  'Machine Operator',
  'Office Assistant',
  'Production Operator',
  'Quality Inspector',
  'Receptionist',
  'Sales Executive',
  'Security Guard',
  'Software Developer',
  'Store Keeper',
  'Supervisor',
  'Technician',
  'Warehouse Assistant',
  'Welder',
];

const INDUSTRY_OPTIONS = [
  'Textile & Garments',
  'Apparel Manufacturing',
  'Knitwear',
  'Spinning Mills',
  'Dyeing & Processing',
  'Garment Export',
  'Engineering & Manufacturing',
  'Automobile & Components',
  'Machinery & Equipment',
  'Information Technology',
  'Software Services',
  'Education & Training',
  'Healthcare',
  'Retail',
  'Wholesale & Trading',
  'Logistics & Transport',
  'Construction & Real Estate',
  'Food & Beverages',
  'Hospitality',
  'Banking & Finance',
  'Agriculture',
  'Packaging',
  'Security Services',
  'Staffing & Recruitment',
];

const EXPERIENCE_OPTIONS = [
  'Fresher',
  ...Array.from({ length: 20 }, (_, index) => `${index + 1}+ years`),
];

const createPosition = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  title: '',
  experiences: [],
  contactName: '',
  contactPhone: '',
  remarks: '',
  remarksEdited: false,
});

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const peopleLabel = (count) => {
  const number = Number(count) || 1;
  return `${number} ${number === 1 ? 'person' : 'people'}`;
};

const phoneDigits = (value) => (value || '').replace(/\D/g, '');
const withRupeeSymbol = (value) => {
  const salary = (value || '').trim();
  if (!salary || salary.includes('₹')) return salary;
  return `₹${salary}`;
};

const levelLine = (item) =>
  `${item.level}: ${peopleLabel(item.count)}${
    item.salary?.trim() ? ` (Salary: ${item.salary.trim()})` : ''
  }`;

const salarySummary = (position) => {
  const rows = position.experiences.filter((item) => item.salary?.trim());

  if (rows.length === 0) return '';

  const unique = [...new Set(rows.map((item) => item.salary.trim()))];

  if (unique.length === 1 && rows.length === position.experiences.length) {
    return unique[0];
  }

  return rows
    .map((item) => `${item.level}: ${item.salary.trim()}`)
    .join(' | ');
};

const generateRemarks = (position) => {
  const title = position.title.trim() || 'This position';
  const experienceText = position.experiences.map(levelLine).join(', ');

  return [
    `Hiring for ${title}.`,
    experienceText ? `Experience requirements: ${experienceText}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const validatePositions = (positions) => {
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    const label = `Position ${index + 1}`;

    if (!position.title.trim()) {
      return `${label}: select a job title.`;
    }

    if (position.experiences.length === 0) {
      return `${label}: select at least one experience level.`;
    }

    if (position.experiences.some((item) => !(Number(item.count) >= 1))) {
      return `${label}: enter how many people you need for each experience level.`;
    }

    if (!position.contactName.trim()) {
      return `${label}: enter the contact person name.`;
    }

    if (!position.contactPhone.trim()) {
      return `${label}: enter the contact phone number.`;
    }

    if (phoneDigits(position.contactPhone).length < 10) {
      return `${label}: enter a valid contact phone number (at least 10 digits).`;
    }
  }

  return '';
};



export default function PostJobPage() {
  const { t, lang } = useLanguage();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [knownCompany, setKnownCompany] = useState(false);

  const [job, setJob] = useState(EMPTY_JOB);
  const [jobs, setJobs] = useState([]);
  const [co, setCo] = useState(EMPTY_CO);
  const [positions, setPositions] = useState([createPosition()]);

  const [fee, setFee] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);

  const [locState, setLocState] = useState('');
  const [locDistrict, setLocDistrict] = useState('');

  const errRef = useRef(null);
  const publishedCountRef = useRef(0);

  useEffect(() => {
    if (err) {
      errRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [err]);

  const errorNote = err ? (
    <p ref={errRef} className="post-error" role="alert">
      {err}
    </p>
  ) : null;

  const setLocation = (state, district) => {
    setLocState(state);
    setLocDistrict(district);

    setJob((previous) => ({
      ...previous,
      location: state && district ? `${district}, ${state}` : '',
    }));
  };

  const bindCo = (name) => ({
    value: co[name] ?? '',
    onChange: (event) =>
      setCo((previous) => ({
        ...previous,
        [name]: event.target.value,
      })),
  });

  const goto = (nextStep) => {
    setErr('');
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updatePosition = (id, updates) => {
    setPositions((previous) =>
      previous.map((position) => {
        if (position.id !== id) return position;

        const changes =
          typeof updates === 'function' ? updates(position) : updates;

        const updated = {
          ...position,
          ...changes,
        };

        if (!updated.remarksEdited) {
          updated.remarks = generateRemarks(updated);
        }

        return updated;
      }),
    );
  };

  const addPosition = () => {
    const position = createPosition();
    position.remarks = generateRemarks(position);

    setPositions((previous) => [...previous, position]);
  };

  const removePosition = (id) => {
    setPositions((previous) =>
      previous.length > 1
        ? previous.filter((position) => position.id !== id)
        : previous,
    );
  };

  const toggleExperience = (id, level) => {
    updatePosition(id, (position) => {
      const exists = position.experiences.some(
        (item) => item.level === level,
      );

      const experiences = exists
        ? position.experiences.filter((item) => item.level !== level)
        : [
            ...position.experiences,
            { level, count: 1, salary: '' },
          ].sort(
            (a, b) =>
              EXPERIENCE_OPTIONS.indexOf(a.level) -
              EXPERIENCE_OPTIONS.indexOf(b.level),
          );

      return { experiences };
    });
  };

  const updateExperienceCount = (id, level, count) => {
    const safeCount =
      count === ''
        ? ''
        : Math.max(1, Math.floor(Number(count)) || 1);

    updatePosition(id, (position) => ({
      experiences: position.experiences.map((item) =>
        item.level === level
          ? { ...item, count: safeCount }
          : item,
      ),
    }));
  };

  const updateExperienceSalary = (id, level, salary) => {
    updatePosition(id, (position) => ({
      experiences: position.experiences.map((item) =>
        item.level === level
          ? { ...item, salary }
          : item,
      ),
    }));
  };

  const identifyCompany = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const normalizedEmail = normalizeEmail(email);

      const existingCompany = await api.getCompanyByEmail(normalizedEmail);

      const accountExists =
        typeof api.companyAccountExists === 'function'
          ? await api.companyAccountExists(normalizedEmail)
          : Boolean(existingCompany);

      if (existingCompany || accountExists) {
        if (typeof api.loginCompanyAccount !== 'function') {
          throw new Error(
            'Account login is not configured in openingsApi.js.',
          );
        }

        await api.loginCompanyAccount({
          email: normalizedEmail,
          password,
        });

        setEmail(normalizedEmail);

        if (existingCompany) {
          setKnownCompany(true);

          setCo({
            companyName: existingCompany.companyName || '',
            contactPerson: existingCompany.contactPerson || '',
            contactDesignation: existingCompany.contactDesignation || '',
            additionalContactPerson:
              existingCompany.additionalContactPerson || '',
            additionalContactDesignation:
              existingCompany.additionalContactDesignation || '',
            phone: existingCompany.phone || '',
            email: existingCompany.email || normalizedEmail,
            location: existingCompany.location || '',
            industry: existingCompany.industry || '',
            website: existingCompany.website || '',
          });

          setFee(await api.getPostingFee(normalizedEmail));
          goto(2);
        } else {
          setKnownCompany(false);
          setCo({ ...EMPTY_CO, email: normalizedEmail });
          goto(1);
        }
      } else {
        if (typeof api.registerCompanyAccount !== 'function') {
          throw new Error(
            'Account registration is not configured in openingsApi.js.',
          );
        }

        await api.registerCompanyAccount({
          email: normalizedEmail,
          password,
        });

        setEmail(normalizedEmail);
        setKnownCompany(false);
        setCo({ ...EMPTY_CO, email: normalizedEmail });
        goto(1);
      }

      setPassword('');
    } catch (error) {
      setErr(error.message || t('post.error'));
    } finally {
      setBusy(false);
    }
  };

  const toJob = (event) => {
    event.preventDefault();
    setErr('');

    if (!co.companyName.trim()) {
      setErr('Enter your company name.');
      return;
    }

    if (!co.industry.trim()) {
      setErr(
        'Select your industry, or type a new one and choose "Add".',
      );
      return;
    }

    if (!co.phone.trim()) {
      setErr('Enter your contact phone number.');
      return;
    }

    if (
      co.additionalContactDesignation.trim() &&
      !co.additionalContactPerson.trim()
    ) {
      setErr(
        'Enter the additional contact person name, or clear their designation.',
      );
      return;
    }

    setCo((previous) => ({
      ...previous,
      email: normalizeEmail(email),
    }));

    setFee(PRICING.firstJob);
    goto(2);
  };

  const submitPositions = async (event) => {
    event.preventDefault();
    setErr('');

    if (!job.location) {
      setErr('Select the job state and district.');
      return;
    }

    const validationError = validatePositions(positions);

    if (validationError) {
      setErr(validationError);
      return;
    }

    const finalPositions = positions.map(
      ({ remarksEdited, ...position }) => {
        const experiences = position.experiences.map((item) => ({
          ...item,
          salary: withRupeeSymbol(item.salary),
        }));
        const normalizedPosition = { ...position, experiences };

        return {
          ...normalizedPosition,
          title: position.title.trim(),
          contactName: position.contactName.trim(),
          contactPhone: position.contactPhone.trim(),
          remarks: remarksEdited
            ? position.remarks
            : generateRemarks(normalizedPosition),
        };
      },
    );

    const jobList = finalPositions.map((position) => ({
      ...job,
      expiryDays: DEFAULT_JOB_EXPIRY_DAYS,
      title: position.title,
      salary: salarySummary(position),
      experience: position.experiences
        .map((experience) => experience.level)
        .join(', '),
      positions: [position],
      description: position.remarks || '',
      requirements: `${position.title}: ${position.experiences
        .map(levelLine)
        .join(', ')}`,
    }));

    setJobs(jobList);
    publishedCountRef.current = 0;
    setBusy(true);

    try {
      setFee(await api.getPostingFee(normalizeEmail(email)));
      goto(3);
    } catch (error) {
      setErr(error.message || t('post.error'));
    } finally {
      setBusy(false);
    }
  };

  const totalFee =
    (fee ?? 0) +
    Math.max(jobs.length - 1, 0) * PRICING.additionalJob;

  const payAndPublish = async () => {
    setBusy(true);
    setErr('');

    try {
      const companyEmail = normalizeEmail(email);

      for (
        let i = publishedCountRef.current;
        i < jobs.length;
        i += 1
      ) {
        const amount = await api.getPostingFee(companyEmail);
        const payment = await api.processPayment(amount);

        await api.publishJob({
          company: {
            ...co,
            email: companyEmail,
          },
          job: jobs[i],
          payment,
        });

        publishedCountRef.current = i + 1;
      }

      setPosted(true);
    } catch (error) {
      setErr(error.message || t('post.error'));
    } finally {
      setBusy(false);
    }
  };

  const postAnother = () => {
    const first = createPosition();
    first.remarks = generateRemarks(first);

    setJob({ ...EMPTY_JOB });
    setJobs([]);
    setPositions([first]);
    publishedCountRef.current = 0;
    setPosted(false);
    setFee(PRICING.additionalJob);
    setKnownCompany(true);
    setLocState('');
    setLocDistrict('');
    goto(2);
  };

  const buildShareMessage = () => {
    const openingsUrl = `${window.location.origin}/services/openings`;
    const lines = [`*We're hiring at ${co.companyName}!*`];

    if (job.location) {
      lines.push(`Location: ${job.location}`);
    }

    jobs.flatMap((item) => item.positions || []).forEach(
      (position, index) => {
        lines.push('', `*${index + 1}. ${position.title}*`);

        position.experiences.forEach((experience) => {
          lines.push(
            `• ${experience.level} - ${peopleLabel(experience.count)}${
              experience.salary?.trim()
                ? ` - ${experience.salary.trim()}`
                : ''
            }`,
          );
        });

      },
    );

    lines.push('', `Apply now: ${openingsUrl}`);

    return lines.join('\n');
  };

  const whatsappShareUrl = () =>
    `https://wa.me/?text=${encodeURIComponent(buildShareMessage())}`;

  const stages = [
    { icon: Mail, label: t('post.account') },
    ...(!knownCompany
      ? [{ icon: Building2, label: t('post.company') }]
      : []),
    { icon: BriefcaseBusiness, label: t('post.job') },
    { icon: CreditCard, label: t('post.payment') },
  ];

  const activeStage = (() => {
    if (step === 0) return 0;
    if (step === 1) return 1;
    if (step === 2) return knownCompany ? 1 : 2;
    return stages.length - 1;
  })();

  if (posted) {
    return (
      <div className="post-page">
      <div aria-hidden="true" className="post-opening-backdrop">
        <div className="post-opening-grid" />
        <div className="post-opening-blob post-opening-blob--a" />
        <div className="post-opening-blob post-opening-blob--b" />
      </div>
      <HiringPipeline stages={POSTING_STAGES} />
      <div className="post-shell relative z-10">
        <div className="post-success">
          <span className="post-success-icon">
            <CheckCircle2 size={34} />
          </span>

          <p className="post-eyebrow">
            {t('post.publishedLabel')}
          </p>

          <h1>{t('post.published')}</h1>

          <p>
            {t('post.liveCopy')}{' '}
            <strong>
              {jobs.map((item) => item.title).join(', ')}
            </strong>
            .
          </p>

          <div className="post-actions">
            <Link
              to="/services/openings"
              className="btn-primary"
            >
              {t('post.viewJobs')} <ArrowRight size={16} />
            </Link>

            <Link to="/company/expired-jobs" className="btn-outline">
              Manage expired jobs
            </Link>

            <a
              href={whatsappShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              <Share2 size={16} /> Share on WhatsApp
            </a>

            <button
              className="btn-outline"
              onClick={postAnother}
            >
              {t('post.another')}
            </button>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="post-page">
    <div aria-hidden="true" className="post-opening-backdrop">
      <div className="post-opening-grid" />
      <div className="post-opening-blob post-opening-blob--a" />
      <div className="post-opening-blob post-opening-blob--b" />
    </div>
    <HiringPipeline stages={POSTING_STAGES} />
    <div className="post-shell relative z-10">
      <div className="post-hero">
        <div className="post-hero-copy">
          <span className="post-kicker">
            <Sparkles size={14} />
            {t('post.kicker')}
          </span>

          <h1>
            {t('post.headline')}{' '}
            <span>{t('post.headlineAccent')}</span>
          </h1>

          <p>{t('post.subhead')}</p>

          <div className="post-trust">
            <span>
              <ShieldCheck size={16} />
              {t('post.simple')}
            </span>

            <span>
              <CreditCard size={16} />
              {t('post.feeNote')}
            </span>
          </div>
        </div>

        <div className="post-hero-art" aria-hidden="true">
          <div className="post-art-ring ring-one" />
          <div className="post-art-ring ring-two" />

          <div className="post-art-card">
            <div className="post-art-icon">
              <BriefcaseBusiness size={25} />
            </div>

            <div className="post-art-line long" />
            <div className="post-art-line" />

            <div className="post-art-tags">
              <i />
              <i />
              <i />
            </div>

            <div className="post-art-bottom">
              <b />
              <span />
            </div>
          </div>

          <span className="post-art-dot dot-one" />
          <span className="post-art-dot dot-two" />
        </div>
      </div>

      <div className="post-workspace">
        <aside className="post-sidebar">
          <p className="post-eyebrow">
            {t('post.getStarted')}
          </p>

          <h2>{t('post.stepsTitle')}</h2>
          <p>{t('post.stepsCopy')}</p>

          <ol className="post-step-list">
            {stages.map((stage, index) => {
              const Icon = stage.icon;

              return (
                <li
                  key={stage.label}
                  className={
                    index === activeStage ? 'active' : ''
                  }
                >
                  <span className="post-step-icon">
                    {index < activeStage ? (
                      <Check size={16} />
                    ) : (
                      <Icon size={16} />
                    )}
                  </span>

                  <span>{stage.label}</span>
                </li>
              );
            })}
          </ol>

          <div className="post-price-note">
            <span>{t('post.transparent')}</span>

            <strong>
              ₹{PRICING.additionalJob}
              <small> / {t('post.eachExtra')}</small>
            </strong>

            <p>
              {t('post.firstJobNote').replace(
                '{price}',
                String(PRICING.firstJob),
              )}
            </p>
          </div>
        </aside>

        <main className="post-panel overflow-visible">
          <div className="post-panel-top">
            <span>{t('post.formLabel')}</span>

            <span className="post-language-label">
              {lang.toUpperCase()}
            </span>
          </div>

          {step === 0 && (
            <form
              className="post-form"
              onSubmit={identifyCompany}
            >
              <div className="post-form-heading">
                <span className="post-form-icon">
                  <ShieldCheck size={20} />
                </span>

                <div>
                  <h2>{t('post.welcome')}</h2>
                  <p>
                    Enter your work email and password to
                    continue.
                  </p>
                </div>
              </div>

              <Field
                label={t('post.email')}
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder={t('post.emailPlaceholder')}
              />

              <label className="block">
                <span className="label">Password <span className="text-red-500">*</span></span>
                <span className="relative block">
                  <input
                    className="input pr-12"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-3 inline-flex items-center text-stone-500 transition hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              <div className="post-inline-note">
                <ShieldCheck size={17} />
                <span>
                  Use your company account credentials to
                  continue.
                </span>
              </div>

              {errorNote}

              <button
                className="btn-primary post-submit"
                disabled={busy}
              >
                {busy ? t('post.checking') : t('post.continue')}{' '}
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          {step === 1 && (
            <form className="post-form" onSubmit={toJob}>
              <div className="post-form-heading">
                <span className="post-form-icon">
                  <Building2 size={20} />
                </span>

                <div>
                  <h2>{t('post.companyDetails')}</h2>
                  <p>{t('post.companyHint')}</p>
                </div>
              </div>

              <div className="post-fields-grid overflow-visible">
                <div className="sm:col-span-2">
                  <Field
                    label={t('post.companyName')}
                    required
                    placeholder="e.g. Sri Textiles Pvt Ltd"
                    {...bindCo('companyName')}
                  />
                </div>

                <div className="sm:col-span-2 relative z-30">
                  <SearchSelect
                    id="company-industry"
                    label={`${t('post.industry')} *`}
                    options={
                      co.industry &&
                      !INDUSTRY_OPTIONS.includes(co.industry)
                        ? [...INDUSTRY_OPTIONS, co.industry]
                        : INDUSTRY_OPTIONS
                    }
                    selected={
                      co.industry ? [co.industry] : []
                    }
                    onSelect={(industry) =>
                      setCo((previous) => ({
                        ...previous,
                        industry,
                      }))
                    }
                    placeholder="Search or add your industry"
                    allowCustom
                    helperText="Start typing to search. If your industry is not listed, type it and select Add."
                    customLabel={(text) =>
                      `+ Add "${text}" as a new industry`
                    }
                  />
                </div>

                <Field
                  label={t('post.contactPerson')}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  {...bindCo('contactPerson')}
                />

                <Field
                  label="Designation"
                  placeholder="e.g. HR Manager"
                  {...bindCo('contactDesignation')}
                />

                <Field
                  label={t('post.phone')}
                  type="tel"
                  inputMode="tel"
                  required
                  placeholder="e.g. 98765 43210"
                  {...bindCo('phone')}
                />

                <Field
                  label={t('post.email')}
                  type="email"
                  required
                  readOnly
                  value={email}
                />

                <Field
                  label={t('post.city')}
                  placeholder="e.g. Tiruppur"
                  {...bindCo('location')}
                />

                <div className="sm:col-span-2">
                  <p className="mb-3 text-sm font-semibold text-[#315844]">
                    Additional contact (optional)
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Additional contact person"
                      placeholder="Optional"
                      {...bindCo('additionalContactPerson')}
                    />

                    <Field
                      label="Additional contact designation"
                      placeholder="e.g. Production Manager"
                      {...bindCo(
                        'additionalContactDesignation',
                      )}
                    />
                  </div>
                </div>
              </div>

              {errorNote}

              <div className="post-form-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => goto(0)}
                >
                  <ArrowLeft size={16} />
                  {t('post.back')}
                </button>

                <button className="btn-primary">
                  {t('post.continueJob')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form
              className="post-form"
              onSubmit={submitPositions}
              noValidate
            >
              <div className="post-form-heading">
                <span className="post-form-icon">
                  <BriefcaseBusiness size={20} />
                </span>

                <div>
                  <h2>{t('post.jobDetails')}</h2>

                  <p>
                    Add each position you are hiring for. Every
                    position is published as its own separate
                    job.
                  </p>
                </div>
              </div>

              {knownCompany && (
                <div className="post-company-chip">
                  <Building2 size={18} />

                  <span>
                    <b>{co.companyName}</b>
                    <small>{co.email}</small>
                  </span>

                  <button
                    type="button"
                    onClick={() => goto(0)}
                  >
                    {t('post.change')}
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <SearchSelect
                  id="job-state"
                  label={`${t('post.location')} - State *`}
                  options={STATES}
                  selected={locState ? [locState] : []}
                  onSelect={(state) =>
                    setLocation(
                      state,
                      state === locState ? locDistrict : '',
                    )
                  }
                  placeholder="Select state"
                />

                <SearchSelect
                  id="job-district"
                  label="District *"
                  options={DISTRICTS[locState] || []}
                  selected={
                    locDistrict ? [locDistrict] : []
                  }
                  onSelect={(district) =>
                    setLocation(locState, district)
                  }
                  placeholder={
                    locState
                      ? 'Select or type district'
                      : 'Select a state first'
                  }
                  disabled={!locState}
                  allowCustom
                  customLabel={(text) => `Use "${text}"`}
                />
              </div>

              <div className="mt-6 space-y-6">
                {positions.map((position, index) => (
                  <section
                    key={position.id}
                    className="rounded-2xl border border-[#e1e8dc] bg-[#fbfcf9] p-4 sm:p-6"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#789078]">
                          POSITION{' '}
                          {String(index + 1).padStart(2, '0')}
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-[#20372a]">
                          Hiring requirements
                        </h3>
                      </div>

                      {positions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removePosition(position.id)
                          }
                          aria-label={`Remove position ${
                            index + 1
                          }`}
                          className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <SearchSelect
                        id={`position-${position.id}`}
                        label="Position"
                        options={POSITION_OPTIONS}
                        selected={
                          position.title ? [position.title] : []
                        }
                        onSelect={(title) =>
                          updatePosition(position.id, {
                            title,
                          })
                        }
                        placeholder="Search or select a job position"
                        allowCustom
                        customLabel={(text) =>
                          `+ Add "${text}" as a new position`
                        }
                      />

                      <SearchSelect
                        id={`experience-${position.id}`}
                        label="Experience required"
                        options={EXPERIENCE_OPTIONS}
                        selected={position.experiences.map(
                          (item) => item.level,
                        )}
                        onSelect={(level) =>
                          toggleExperience(position.id, level)
                        }
                        placeholder="Search or select experience levels"
                        multiple
                        closeOnSelect
                      />
                    </div>

                    {position.experiences.length > 0 && (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {position.experiences.map(
                            (experience) => (
                              <div
                                key={experience.level}
                                className="rounded-xl border border-[#e4eadf] bg-white p-3 sm:p-4"
                              >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-[#294333]">
                                    {experience.level}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleExperience(
                                        position.id,
                                        experience.level,
                                      )
                                    }
                                    aria-label={`Remove ${experience.level}`}
                                    className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                                  <div>
                                    <label
                                      htmlFor={`${position.id}-${experience.level}-count`}
                                      className="mb-1.5 block text-xs text-stone-500"
                                    >
                                      People needed
                                    </label>

                                    <input
                                      id={`${position.id}-${experience.level}-count`}
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={
                                        experience.count
                                      }
                                      onChange={(event) =>
                                        updateExperienceCount(
                                          position.id,
                                          experience.level,
                                          event.target.value,
                                        )
                                      }
                                      className="w-full rounded-lg border border-[#dfe7dd] px-3 py-2.5 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                                    />
                                  </div>

                                  <div>
                                    <label
                                      htmlFor={`${position.id}-${experience.level}-salary`}
                                      className="mb-1.5 block text-xs text-stone-500"
                                    >
                                      Salary for{' '}
                                      {experience.level}
                                    </label>

                                    <input
                                      id={`${position.id}-${experience.level}-salary`}
                                      type="text"
                                      value={
                                        experience.salary
                                      }
                                      onChange={(event) =>
                                        updateExperienceSalary(
                                          position.id,
                                          experience.level,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="e.g. ₹15,000/month or ₹15,000–₹20,000"
                                      className="w-full rounded-lg border border-[#dfe7dd] px-3 py-2.5 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                                    />
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                    )}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`contact-name-${position.id}`}
                          className="label mb-2 block"
                        >
                          Contact person name *
                        </label>

                        <input
                          id={`contact-name-${position.id}`}
                          type="text"
                          autoComplete="name"
                          value={position.contactName}
                          onChange={(event) =>
                            updatePosition(position.id, {
                              contactName:
                                event.target.value,
                            })
                          }
                          placeholder="e.g. Ramesh Kumar"
                          className="w-full rounded-xl border border-[#dfe7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`contact-phone-${position.id}`}
                          className="label mb-2 block"
                        >
                          Contact phone number *
                        </label>

                        <input
                          id={`contact-phone-${position.id}`}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={position.contactPhone}
                          onChange={(event) =>
                            updatePosition(position.id, {
                              contactPhone:
                                event.target.value.replace(
                                  /[^\d+\-\s]/g,
                                  '',
                                ),
                            })
                          }
                          placeholder="e.g. 98765 43210"
                          className="w-full rounded-xl border border-[#dfe7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor={`remarks-${position.id}`}
                          className="label"
                        >
                          Remarks
                        </label>

                        <span className="text-[11px] font-medium text-[#789078]">
                          Auto-generated · Editable
                        </span>
                      </div>

                      <textarea
                        id={`remarks-${position.id}`}
                        rows={4}
                        value={position.remarks}
                        onChange={(event) =>
                          updatePosition(position.id, {
                            remarks: event.target.value,
                            remarksEdited: true,
                          })
                        }
                        placeholder="Additional requirements or details..."
                        className="w-full resize-y rounded-xl border border-[#dfe7dd] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                      />

                      <p className="mt-2 text-xs text-stone-500">
                        Remarks are generated from the
                        position, experience, headcount, salary
                        and contact details. Edit them freely.
                      </p>
                    </div>
                  </section>
                ))}
              </div>

              <button
                type="button"
                onClick={addPosition}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#b9cdb0] bg-[#f4f7ef] px-5 py-4 text-sm font-bold text-[#315844] transition hover:border-[#71966a] hover:bg-[#eaf1df]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#315844] text-white">
                  <Plus size={17} />
                </span>

                Add another position
              </button>

              {errorNote}

              <div className="post-form-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() =>
                    goto(knownCompany ? 0 : 1)
                  }
                >
                  <ArrowLeft size={16} />
                  {t('post.back')}
                </button>

                <button
                  className="btn-primary"
                  disabled={busy}
                >
                  {busy
                    ? t('post.checking')
                    : t('post.reviewPayment')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="post-form">
              <div className="post-form-heading">
                <span className="post-form-icon">
                  <CreditCard size={20} />
                </span>

                <div>
                  <h2>{t('post.review')}</h2>
                  <p>{t('post.reviewCopy')}</p>
                </div>
              </div>

              <div className="post-order-card">
                <div className="post-order-row">
                  <span>{t('post.role')}</span>

                  <b>
                    {jobs.length}{' '}
                    {jobs.length === 1 ? 'job' : 'separate jobs'}
                  </b>
                </div>

                <div className="post-order-row">
                  <span>{t('post.company')}</span>
                  <b>{co.companyName}</b>
                </div>

                <div className="post-order-row">
                  <span>{t('post.location')}</span>
                  <b>{job.location}</b>
                </div>

                {jobs.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-[#e5e9df] pt-4">
                    <p className="text-sm font-bold">
                      Jobs to be published
                    </p>

                    {jobs.map((item, index) => {
                      const position = item.positions[0];

                      return (
                        <div
                          key={position.id}
                          className="rounded-xl bg-[#f7f9f4] p-3"
                        >
                          <p className="font-semibold">
                            Job {index + 1}: {item.title}
                          </p>

                          <ul className="mt-1 space-y-0.5 text-xs text-stone-500">
                            {position.experiences.map(
                              (experience) => (
                                <li
                                  key={experience.level}
                                >
                                  {experience.level}:{' '}
                                  {peopleLabel(
                                    experience.count,
                                  )}
                                  {experience.salary?.trim()
                                    ? ` · ${experience.salary.trim()}`
                                    : ''}
                                </li>
                              ),
                            )}
                          </ul>

                          {(position.contactName ||
                            position.contactPhone) && (
                            <p className="mt-1 text-xs text-stone-500">
                              Contact:{' '}
                              {[
                                position.contactName,
                                position.contactPhone,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}

                          {position.remarks && (
                            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-600">
                              {position.remarks}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="post-order-total">
                  <span>{t('post.postingFee')}</span>

                  <strong>₹{totalFee}</strong>
                </div>

                <p>
                  {knownCompany
                    ? t('post.returningFee')
                    : t('post.newFee')}
                </p>
              </div>

              <div className="post-inline-note">
                <ShieldCheck size={17} />
                <span>{t('post.demoPayment')}</span>
              </div>

              {errorNote}

              <div className="post-form-footer">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => goto(2)}
                  disabled={busy}
                >
                  <ArrowLeft size={16} />
                  {t('post.back')}
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={payAndPublish}
                  disabled={busy}
                >
                  {busy
                    ? t('post.processing')
                    : `${t('post.pay')} ₹${totalFee}`}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <p className="post-footnote">{t('post.footer')}</p>
    </div>
    </div>
  );
}
