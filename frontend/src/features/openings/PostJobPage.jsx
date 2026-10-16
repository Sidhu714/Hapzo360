import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, Check, CheckCircle2,
  ChevronDown, CreditCard, Mail, Plus, Share2, ShieldCheck, Sparkles, X,
} from 'lucide-react';

import { PRICING } from '../../config';
import { useLanguage } from '../../context/LanguageContext';
import Field from '../../components/Field';
import { STATES, DISTRICTS } from '../../data/indiaLocations';
import * as api from './openingsApi';

const EMPTY_JOB = {
  title: '', jobType: 'full-time', gender: 'any', category: 'other',
  location: '', salary: '', experience: '', description: '', requirements: '',
  image: '', positions: [],
};

const EMPTY_CO = {
  companyName: '', contactPerson: '', phone: '', email: '',
  location: '', industry: '', website: '',
};

const POSITION_OPTIONS = [
  'Accountant', 'Accountant Assistant', 'Admin Executive',
  'Back Office Executive', 'Business Development Executive', 'Cashier',
  'Customer Support Executive', 'Data Entry Operator', 'Delivery Executive',
  'Driver', 'Electrician', 'Field Sales Executive', 'HR Executive',
  'Machine Operator', 'Office Assistant', 'Production Operator',
  'Quality Inspector', 'Receptionist', 'Sales Executive', 'Security Guard',
  'Software Developer', 'Store Keeper', 'Supervisor', 'Technician',
  'Warehouse Assistant', 'Welder',
];

const EXPERIENCE_OPTIONS = [
  'Fresher',
  ...Array.from({ length: 20 }, (_, index) => `${index + 1}+ years`),
];

const createPosition = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  title: '',
  experiences: [],
  salary: '',
  remarks: '',
  remarksEdited: false,
});

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const peopleLabel = (count) => {
  const number = Number(count) || 1;
  return `${number} ${number === 1 ? 'person' : 'people'}`;
};

const generateRemarks = (position) => {
  const title = position.title.trim() || 'This position';
  const experienceText = position.experiences
    .map((item) => `${item.level}: ${peopleLabel(item.count)}`)
    .join(', ');
  const salaryText = position.salary ? `Salary: ${position.salary}.` : '';
  return [
    `Hiring for ${title}.`,
    experienceText ? `Experience requirements: ${experienceText}.` : '',
    salaryText,
  ].filter(Boolean).join(' ');
};

// Returns an error message, or '' when every position is valid
const validatePositions = (positions) => {
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    const label = `Position ${index + 1}`;
    if (!position.title.trim()) return `${label}: select a job title.`;
    if (position.experiences.length === 0) return `${label}: select at least one experience level.`;
    if (position.experiences.some((item) => !(Number(item.count) >= 1))) {
      return `${label}: enter how many people you need for each experience level.`;
    }
  }
  return '';
};

/**
 * Searchable dropdown.
 * - single mode: picking an option sets it and closes the list
 * - multiple mode: picking toggles the option and the list stays open
 * Supports keyboard (arrows, Enter, Escape), outside click, and optional custom values.
 */
function SearchSelect({
  id, label, options, selected, onSelect, placeholder,
  multiple = false, allowCustom = false, disabled = false, customLabel,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const needle = query.trim().toLowerCase();
  const rows = options
    .filter((option) => option.toLowerCase().includes(needle))
    .map((option) => ({ label: option, custom: false }));

  if (allowCustom && needle && !options.some((option) => option.toLowerCase() === needle)) {
    rows.push({ label: query.trim(), custom: true });
  }

  const active = Math.min(highlight, Math.max(rows.length - 1, 0));

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const openList = () => {
    setOpen(true);
    setHighlight(0);
  };

  const closeList = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (row) => {
    onSelect(row.label);
    setQuery('');
    setHighlight(0);
    if (!multiple) setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) openList();
      else setHighlight(Math.min(active + 1, rows.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(Math.max(active - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault(); // Enter must never submit the surrounding form from here
      if (open && rows[active]) choose(rows[active]);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      closeList();
    }
  };

  const listId = `${id}-listbox`;
  const inputValue = open ? query : (!multiple ? selected[0] ?? '' : '');
  const inputPlaceholder = multiple
    ? (selected.length ? `${selected.length} selected` : placeholder)
    : (open && selected[0] ? selected[0] : placeholder);

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="label mb-2 block">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={inputPlaceholder}
          onFocus={openList}
          onClick={() => { if (!open) openList(); }}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-[#dfe7dd] bg-white py-3 pl-4 pr-10 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
        />
        <ChevronDown
          size={18}
          className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-[#e1e8dc] bg-white p-2 shadow-xl"
        >
          {rows.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-stone-500">No matches found</li>
          )}
          {rows.map((row, index) => {
            const isSelected = selected.includes(row.label);
            return (
              <li
                key={`${row.custom ? 'new-' : ''}${row.label}`}
                role="option"
                aria-selected={isSelected}
                data-active={index === active}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault(); // keep focus in the input
                  choose(row);
                }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  index === active ? 'bg-[#eef3e7]' : ''
                } ${
                  row.custom
                    ? 'mt-1 border-t border-[#edf0e9] font-semibold text-[#315844]'
                    : isSelected ? 'font-semibold text-[#315844]' : 'text-[#20372a]'
                }`}
              >
                <span>{row.custom ? (customLabel ? customLabel(row.label) : `+ Add "${row.label}" as a new position`) : row.label}</span>
                {isSelected && <Check size={15} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PostJobPage() {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [knownCompany, setKnownCompany] = useState(false);
  const [job, setJob] = useState(EMPTY_JOB);
  const [co, setCo] = useState(EMPTY_CO);
  const [positions, setPositions] = useState([createPosition()]);
  const [fee, setFee] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);
  const [locState, setLocState] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const errRef = useRef(null);

  // Bring validation / API errors into view (the position form is long)
  useEffect(() => {
    if (err) errRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [err]);

  const errorNote = err
    ? <p ref={errRef} className="post-error" role="alert">{err}</p>
    : null;

  const bindJob = (name) => ({
    value: job[name] ?? '',
    onChange: (event) => setJob((previous) => ({ ...previous, [name]: event.target.value })),
  });

  // Keeps job.location as one string ("District, State"), so cards, filters and sharing work unchanged
  const setLocation = (state, district) => {
    setLocState(state);
    setLocDistrict(district);
    setJob((previous) => ({ ...previous, location: state && district ? `${district}, ${state}` : '' }));
  };

  const bindCo = (name) => ({
    value: co[name] ?? '',
    onChange: (event) => setCo((previous) => ({ ...previous, [name]: event.target.value })),
  });

  const goto = (nextStep) => {
    setErr('');
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // `updates` can be an object or a function (position) => object.
  // Remarks are regenerated automatically until the user edits them by hand.
  const updatePosition = (id, updates) => {
    setPositions((previous) => previous.map((position) => {
      if (position.id !== id) return position;
      const changes = typeof updates === 'function' ? updates(position) : updates;
      const updated = { ...position, ...changes };
      if (!updated.remarksEdited) updated.remarks = generateRemarks(updated);
      return updated;
    }));
  };

  const addPosition = () => setPositions((previous) => [...previous, createPosition()]);

  const removePosition = (id) => {
    setPositions((previous) => (previous.length > 1
      ? previous.filter((position) => position.id !== id)
      : previous));
  };

  const toggleExperience = (id, level) => {
    updatePosition(id, (position) => {
      const exists = position.experiences.some((item) => item.level === level);
      const experiences = exists
        ? position.experiences.filter((item) => item.level !== level)
        : [...position.experiences, { level, count: 1 }].sort(
          (a, b) => EXPERIENCE_OPTIONS.indexOf(a.level) - EXPERIENCE_OPTIONS.indexOf(b.level),
        );
      return { experiences };
    });
  };

  const updateExperienceCount = (id, level, count) => {
    const safeCount = count === '' ? '' : Math.max(1, Math.floor(Number(count)) || 1);
    updatePosition(id, (position) => ({
      experiences: position.experiences.map((item) =>
        (item.level === level ? { ...item, count: safeCount } : item)),
    }));
  };

  const identifyCompany = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErr('');

    try {
      const normalizedEmail = normalizeEmail(email);
      const existingCompany = await api.getCompanyByEmail(normalizedEmail);
      const accountExists = typeof api.companyAccountExists === 'function'
        ? await api.companyAccountExists(normalizedEmail)
        : Boolean(existingCompany);

      if (existingCompany || accountExists) {
        if (typeof api.loginCompanyAccount !== 'function') {
          throw new Error('Account login is not configured in openingsApi.js.');
        }

        await api.loginCompanyAccount({ email: normalizedEmail, password });
        setEmail(normalizedEmail);

        if (existingCompany) {
          setKnownCompany(true);
          setCo({
            companyName: existingCompany.companyName || '',
            contactPerson: existingCompany.contactPerson || '',
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
          throw new Error('Account registration is not configured in openingsApi.js.');
        }
        await api.registerCompanyAccount({ email: normalizedEmail, password });
        setEmail(normalizedEmail);
        setKnownCompany(false);
        setCo({ ...EMPTY_CO, email: normalizedEmail });
        goto(1);
      }

      setPassword(''); // don't keep the password in memory once it has been used
    } catch (error) {
      setErr(error.message || t('post.error'));
    } finally {
      setBusy(false);
    }
  };

  const toJob = (event) => {
    event.preventDefault();
    setCo((previous) => ({ ...previous, email: normalizeEmail(email) }));
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

    const finalPositions = positions.map(({ remarksEdited, ...position }) => ({
      ...position,
      remarks: remarksEdited ? position.remarks : generateRemarks(position),
    }));

    const titles = finalPositions.map((position) => position.title.trim());
    const allExperience = [...new Set(
      finalPositions.flatMap((position) => position.experiences.map((experience) => experience.level)),
    )];

    const jobPayload = {
      ...job,
      title: titles.join(', '),
      salary: finalPositions[0].salary || '',
      experience: allExperience.join(', '),
      positions: finalPositions,
      description: finalPositions.map((position) => position.remarks).filter(Boolean).join('\n\n'),
      requirements: finalPositions.map((position) =>
        `${position.title}: ${position.experiences.map((experience) =>
          `${experience.level} (${peopleLabel(experience.count)})`).join(', ')}`,
      ).join('\n'),
    };

    setJob(jobPayload);
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

  const payAndPublish = async () => {
    setBusy(true);
    setErr('');
    try {
      const payment = await api.processPayment(fee);
      await api.publishJob({
        company: { ...co, email: normalizeEmail(email) },
        job,
        payment,
      });
      setPosted(true);
    } catch (error) {
      setErr(error.message || t('post.error'));
    } finally {
      setBusy(false);
    }
  };

  const postAnother = () => {
    setJob({ ...EMPTY_JOB });
    setPositions([createPosition()]);
    setPosted(false);
    setFee(PRICING.additionalJob);
    setKnownCompany(true);
    goto(2);
  };

  // Detailed WhatsApp message (WhatsApp formats *text* as bold)
  const buildShareMessage = () => {
    const openingsUrl = `${window.location.origin}/services/openings`;
    const lines = [`*We're hiring at ${co.companyName}!*`];

    if (job.location) lines.push(`📍 Location: ${job.location}`);

    (job.positions || []).forEach((position, index) => {
      lines.push('', `*${index + 1}. ${position.title}*`);
      lines.push(
        `Experience: ${position.experiences
          .map((experience) => `${experience.level} (${peopleLabel(experience.count)})`)
          .join(', ')}`,
      );
      if (position.salary) lines.push(`Salary: ${position.salary}`);
    });

    lines.push('', `Apply now: ${openingsUrl}`);
    return lines.join('\n');
  };

  // wa.me opens the WhatsApp app on phones and WhatsApp Web on desktop
  const whatsappShareUrl = () =>
    `https://wa.me/?text=${encodeURIComponent(buildShareMessage())}`;

  const stages = [
    { icon: Mail, label: t('post.account') },
    ...(!knownCompany ? [{ icon: Building2, label: t('post.company') }] : []),
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
      <div className="post-shell">
        <div className="post-success">
          <span className="post-success-icon"><CheckCircle2 size={34} /></span>
          <p className="post-eyebrow">{t('post.publishedLabel')}</p>
          <h1>{t('post.published')}</h1>
          <p>{t('post.liveCopy')} <strong>{job.title}</strong>.</p>
          <div className="post-actions">
            <Link to="/services/openings" className="btn-primary">
              {t('post.viewJobs')} <ArrowRight size={16} />
            </Link>
            <a
              href={whatsappShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              <Share2 size={16} /> Share on WhatsApp
            </a>
            <button className="btn-outline" onClick={postAnother}>{t('post.another')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="post-shell">
      <div className="post-hero">
        <div className="post-hero-copy">
          <span className="post-kicker"><Sparkles size={14} />{t('post.kicker')}</span>
          <h1>{t('post.headline')} <span>{t('post.headlineAccent')}</span></h1>
          <p>{t('post.subhead')}</p>
          <div className="post-trust">
            <span><ShieldCheck size={16} />{t('post.simple')}</span>
            <span><CreditCard size={16} />{t('post.feeNote')}</span>
          </div>
        </div>
        <div className="post-hero-art" aria-hidden="true">
          <div className="post-art-ring ring-one" />
          <div className="post-art-ring ring-two" />
          <div className="post-art-card">
            <div className="post-art-icon"><BriefcaseBusiness size={25} /></div>
            <div className="post-art-line long" />
            <div className="post-art-line" />
            <div className="post-art-tags"><i /><i /><i /></div>
            <div className="post-art-bottom"><b /><span /></div>
          </div>
          <span className="post-art-dot dot-one" />
          <span className="post-art-dot dot-two" />
        </div>
      </div>

      <div className="post-workspace">
        <aside className="post-sidebar">
          <p className="post-eyebrow">{t('post.getStarted')}</p>
          <h2>{t('post.stepsTitle')}</h2>
          <p>{t('post.stepsCopy')}</p>
          <ol className="post-step-list">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <li key={stage.label} className={index === activeStage ? 'active' : ''}>
                  <span className="post-step-icon">
                    {index < activeStage ? <Check size={16} /> : <Icon size={16} />}
                  </span>
                  <span>{stage.label}</span>
                </li>
              );
            })}
          </ol>
          <div className="post-price-note">
            <span>{t('post.transparent')}</span>
            <strong>₹{PRICING.additionalJob}<small> / {t('post.eachExtra')}</small></strong>
            <p>{t('post.firstJobNote').replace('{price}', String(PRICING.firstJob))}</p>
          </div>
        </aside>

        <main className="post-panel">
          <div className="post-panel-top">
            <span>{t('post.formLabel')}</span>
            <span className="post-language-label">{lang.toUpperCase()}</span>
          </div>

          {step === 0 && (
            <form className="post-form" onSubmit={identifyCompany}>
              <div className="post-form-heading">
                <span className="post-form-icon"><ShieldCheck size={20} /></span>
                <div>
                  <h2>{t('post.welcome')}</h2>
                  <p>Enter your work email and password to continue.</p>
                </div>
              </div>
              <Field
                label={t('post.email')}
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('post.emailPlaceholder')}
              />
              <Field
                label="Password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
              <div className="post-inline-note">
                <ShieldCheck size={17} />
                <span>Use your company account credentials to continue.</span>
              </div>
              {errorNote}
              <button className="btn-primary post-submit" disabled={busy}>
                {busy ? t('post.checking') : t('post.continue')} <ArrowRight size={17} />
              </button>
            </form>
          )}

          {step === 1 && (
            <form className="post-form" onSubmit={toJob}>
              <div className="post-form-heading">
                <span className="post-form-icon"><Building2 size={20} /></span>
                <div><h2>{t('post.companyDetails')}</h2><p>{t('post.companyHint')}</p></div>
              </div>
              <div className="post-fields-grid">
                <Field label={t('post.companyName')} required {...bindCo('companyName')} />
                <Field label={t('post.contactPerson')} required {...bindCo('contactPerson')} />
                <Field label={t('post.phone')} type="tel" required {...bindCo('phone')} />
                {/* Read-only: the account was already created with this email */}
                <Field
                  label={t('post.email')}
                  type="email"
                  required
                  readOnly
                  value={email}
                />
                <Field label={t('post.city')} required {...bindCo('location')} />
                <Field label={t('post.industry')} required {...bindCo('industry')} />
                <div className="sm:col-span-2">
                  <Field label={t('post.website')} type="url" {...bindCo('website')} placeholder="https://" />
                </div>
              </div>
              {errorNote}
              <div className="post-form-footer">
                <button type="button" className="btn-outline" onClick={() => goto(0)}>
                  <ArrowLeft size={16} />{t('post.back')}
                </button>
                <button className="btn-primary">{t('post.continueJob')}<ArrowRight size={16} /></button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form className="post-form" onSubmit={submitPositions} noValidate>
              <div className="post-form-heading">
                <span className="post-form-icon"><BriefcaseBusiness size={20} /></span>
                <div>
                  <h2>{t('post.jobDetails')}</h2>
                  <p>Add each position you are hiring for, with its experience and headcount.</p>
                </div>
              </div>

              {knownCompany && (
                <div className="post-company-chip">
                  <Building2 size={18} />
                  <span><b>{co.companyName}</b><small>{co.email}</small></span>
                  <button type="button" onClick={() => goto(0)}>{t('post.change')}</button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <SearchSelect
                  id="job-state"
                  label={`${t('post.location')} - State *`}
                  options={STATES}
                  selected={locState ? [locState] : []}
                  onSelect={(state) => setLocation(state, state === locState ? locDistrict : '')}
                  placeholder="Select state"
                />
                <SearchSelect
                  id="job-district"
                  label="District *"
                  options={DISTRICTS[locState] || []}
                  selected={locDistrict ? [locDistrict] : []}
                  onSelect={(district) => setLocation(locState, district)}
                  placeholder={locState ? 'Select or type district' : 'Select a state first'}
                  disabled={!locState}
                  allowCustom
                  customLabel={(text) => `Use "${text}"`}
                />
              </div>

              <div className="mt-6 space-y-6">
                {positions.map((position, index) => (
                  <section key={position.id} className="rounded-2xl border border-[#e1e8dc] bg-[#fbfcf9] p-4 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#789078]">
                          POSITION {String(index + 1).padStart(2, '0')}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-[#20372a]">Hiring requirements</h3>
                      </div>
                      {positions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePosition(position.id)}
                          aria-label={`Remove position ${index + 1}`}
                          className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <SearchSelect
                      id={`position-${position.id}`}
                      label="Position"
                      options={POSITION_OPTIONS}
                      selected={position.title ? [position.title] : []}
                      onSelect={(title) => updatePosition(position.id, { title })}
                      placeholder="Search or select a job position"
                      allowCustom
                    />

                    <div className="mt-6">
                      <SearchSelect
                        id={`experience-${position.id}`}
                        label="Experience required"
                        options={EXPERIENCE_OPTIONS}
                        selected={position.experiences.map((item) => item.level)}
                        onSelect={(level) => toggleExperience(position.id, level)}
                        placeholder="Search or select experience levels"
                        multiple
                      />

                      {position.experiences.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {position.experiences.map((experience) => (
                            <div key={experience.level} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e4eadf] bg-white p-3">
                              <span className="text-sm font-semibold text-[#294333]">{experience.level}</span>
                              <div className="flex items-center gap-3">
                                <label htmlFor={`${position.id}-${experience.level}`} className="text-xs text-stone-500">
                                  People needed
                                </label>
                                <input
                                  id={`${position.id}-${experience.level}`}
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={experience.count}
                                  onChange={(event) => updateExperienceCount(position.id, experience.level, event.target.value)}
                                  className="w-20 rounded-lg border border-[#dfe7dd] px-3 py-2 text-center text-sm outline-none focus:border-[#70a879]"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleExperience(position.id, experience.level)}
                                  aria-label={`Remove ${experience.level}`}
                                  className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <label htmlFor={`salary-${position.id}`} className="label mb-2 block">Salary / salary range</label>
                      <input
                        id={`salary-${position.id}`}
                        type="text"
                        value={position.salary}
                        onChange={(event) => updatePosition(position.id, { salary: event.target.value })}
                        placeholder="e.g. ₹15,000/month or ₹15,000–₹20,000"
                        className="w-full rounded-xl border border-[#dfe7dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                      />
                    </div>

                    <div className="mt-6">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={`remarks-${position.id}`} className="label">Remarks</label>
                        <span className="text-[11px] font-medium text-[#789078]">Auto-generated · Editable</span>
                      </div>
                      <textarea
                        id={`remarks-${position.id}`}
                        rows={4}
                        value={position.remarks}
                        onChange={(event) =>
                          updatePosition(position.id, { remarks: event.target.value, remarksEdited: true })}
                        placeholder="Additional requirements or details..."
                        className="w-full resize-y rounded-xl border border-[#dfe7dd] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                      />
                      <p className="mt-2 text-xs text-stone-500">
                        Remarks are generated from the position, experience, headcount and salary. Edit them freely.
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
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#315844] text-white"><Plus size={17} /></span>
                Add another position
              </button>

              {errorNote}
              <div className="post-form-footer">
                <button type="button" className="btn-outline" onClick={() => goto(knownCompany ? 0 : 1)}>
                  <ArrowLeft size={16} />{t('post.back')}
                </button>
                <button className="btn-primary" disabled={busy}>
                  {busy ? t('post.checking') : t('post.reviewPayment')}<ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="post-form">
              <div className="post-form-heading">
                <span className="post-form-icon"><CreditCard size={20} /></span>
                <div><h2>{t('post.review')}</h2><p>{t('post.reviewCopy')}</p></div>
              </div>

              <div className="post-order-card">
                <div className="post-order-row"><span>{t('post.role')}</span><b>{job.title}</b></div>
                <div className="post-order-row"><span>{t('post.company')}</span><b>{co.companyName}</b></div>
                <div className="post-order-row"><span>{t('post.location')}</span><b>{job.location}</b></div>

                {job.positions?.length > 0 && (
                  <div className="mt-4 space-y-3 border-t border-[#e5e9df] pt-4">
                    <p className="text-sm font-bold">Positions summary</p>
                    {job.positions.map((position) => (
                      <div key={position.id} className="rounded-xl bg-[#f7f9f4] p-3">
                        <p className="font-semibold">{position.title}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {position.experiences.map((experience) =>
                            `${experience.level}: ${peopleLabel(experience.count)}`,
                          ).join(' · ')}
                        </p>
                        {position.salary && <p className="mt-1 text-xs text-stone-500">Salary: {position.salary}</p>}
                        {position.remarks && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-600">{position.remarks}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="post-order-total"><span>{t('post.postingFee')}</span><strong>₹{fee}</strong></div>
                <p>{knownCompany ? t('post.returningFee') : t('post.newFee')}</p>
              </div>

              <div className="post-inline-note"><ShieldCheck size={17} /><span>{t('post.demoPayment')}</span></div>
              {errorNote}

              <div className="post-form-footer">
                <button type="button" className="btn-outline" onClick={() => goto(2)} disabled={busy}>
                  <ArrowLeft size={16} />{t('post.back')}
                </button>
                <button type="button" className="btn-primary" onClick={payAndPublish} disabled={busy}>
                  {busy ? t('post.processing') : `${t('post.pay')} ₹${fee}`}<ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <p className="post-footnote">{t('post.footer')}</p>
    </div>
  );
}