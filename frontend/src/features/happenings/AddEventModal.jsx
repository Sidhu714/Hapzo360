import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight,
    Camera,
    Check,
    ChevronDown,
    MessageCircle,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react';

// Move your existing `suggestionBank` and `fallbackSuggestions` constants into
// ./eventSuggestions.js and export them (see the note that came with this file).
import { suggestionBank, fallbackSuggestions } from './eventSuggestions';
import SearchSelect from '../openings/SearchSelect';
import { ALL_INDIA, STATES, districtOptionsForState } from '../../data/indiaLocations';

const categories = ['Business', 'Community', 'Workshops', 'Webinar', 'Conference', 'Expo'];
const sectors = ['Textile', 'Education', 'Engineering', 'Technology'];
const sectorSpecialties = {
    Textile: ['Spinning', 'Weaving', 'Knitting', 'Dyeing', 'Printing', 'Garment manufacturing', 'Embroidery', 'Textile trading'],
    Education: ['School education', 'Higher education', 'Coaching', 'Vocational training', 'EdTech', 'Research'],
    Engineering: ['Civil', 'Mechanical', 'Electrical', 'Electronics', 'Automotive', 'Manufacturing', 'Construction'],
    Technology: ['Software', 'AI and data', 'Cybersecurity', 'Cloud', 'Hardware', 'IT services', 'Product development'],
};
const faceSteps = ['Look straight at the camera', 'Turn your head to your left', 'Turn your head to your right'];
const DESCRIPTION_MAX = 1200;

const inputBase =
    'w-full rounded-xl border border-[#11192f]/10 bg-white px-4 py-3.5 text-sm text-[#11192f] outline-none transition duration-200 placeholder:text-[#11192f]/35 focus:border-[#50627e] focus:ring-2 focus:ring-[#ff5577]/30';

const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-full bg-[#11192f] font-bold text-white transition duration-200 hover:bg-[#4c5a75] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5577] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfcfe] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none';

const thinScroll =
    '[scrollbar-width:thin] [scrollbar-color:rgba(33,23,42,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#11192f]/25 hover:[&::-webkit-scrollbar-thumb]:bg-[#11192f]/40';

function useEntered() {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setEntered(true));
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    return entered;
}

function Modal({ closing, onBackdrop, labelledBy, children }) {
    const entered = useEntered();
    const show = entered && !closing;

    return createPortal((
        <div
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onBackdrop?.();
            }}
            className={`fixed inset-0 z-[100] flex items-end justify-center bg-[#11192f]/65 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:items-center sm:p-5 ${show ? 'opacity-100' : 'opacity-0'}`}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                className={`relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#fbfcfe] text-[#11192f] shadow-2xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:max-h-[90dvh] sm:rounded-[1.75rem] ${show ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-[0.98] opacity-0'}`}
            >
                {children}
            </section>
        </div>
    ), document.body);
}

function Panel({ icon: Icon, title, badge, children }) {
    return (
        <div className="rounded-2xl border border-[#11192f]/10 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-bold">
                <Icon size={17} className="text-[#526783]" />
                {title}
                {badge}
            </div>
            {children}
        </div>
    );
}

function SelectField({ label, name, value, onChange, options }) {
    return (
        <label className="block space-y-2">
            <span className="text-sm font-bold">{label}</span>
            <div className="relative">
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`${inputBase} appearance-none pr-11`}
                >
                    {options.map((item) => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </select>
                <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#11192f]/50"
                />
            </div>
        </label>
    );
}

export default function AddEventModal({
    closing,
    onClose,
    onBackdrop,
    form,
    minDate,
    onFieldChange,
    onSubmit,
    formError,
    mobile,
    setMobile,
    otp,
    setOtp,
    otpState,
    otpMessage,
    otpSeconds,
    sendDemoOtp,
    verifyDemoOtp,
    faceState,
    faceStep,
    faceMessage,
    faceSecondsLeft = 30,
    clip,
    onRetake,
    videoRef,
    startFaceCheck,
    stopCamera,
    setFaceState,
    imageBusy,
    chooseImage,
    onRemoveImage,
}) {
    const selectedCategory = form.category || categories[0];
    const selectedSector = form.sector || sectors[0];
    const description = form.description || '';

    // The sector picker displays a default, so write that default into the form too.
    // Otherwise `sector` is never submitted unless the user changes it.
    useEffect(() => {
        if (form.sector !== selectedSector) {
            onFieldChange({ target: { name: 'sector', value: selectedSector } });
        }
    }, [form.sector, selectedSector]);

    const currentSuggestions = useMemo(
        () => suggestionBank[`${selectedCategory}-${selectedSector}`] || fallbackSuggestions,
        [selectedCategory, selectedSector]
    );

    const handleSelectSuggestion = (suggestion) => {
        const line = `• ${suggestion}`;
        if (description.includes(line)) return;
        const next = description.trim() ? `${description.trim()}\n${line}` : line;
        if (next.length > DESCRIPTION_MAX) return;
        onFieldChange({ target: { name: 'description', value: next } });
    };

    const handleMobileChange = (event) =>
        setMobile(event.target.value.replace(/\D/g, '').slice(0, 10));
    const handleOtpChange = (event) =>
        setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));

    return (
        <Modal closing={closing} onBackdrop={onBackdrop} labelledBy="add-title">
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#11192f] via-[#172847] to-[#243c60] px-5 pb-6 pt-5 text-white sm:px-8 sm:pb-7 sm:pt-8">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#56dfff]/30 blur-3xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#ff5577]/25 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#ffe66d]">
                            Tiruppur community
                        </p>
                        <h2 id="add-title" className="text-3xl font-black tracking-[-0.055em]">
                            Add a new event
                        </h2>
                        <p className="mt-2 text-sm text-white/75">
                            Give people a reason to get together.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 rounded-full border border-white/25 bg-white/10 p-2.5 text-white transition duration-200 hover:bg-white/20 active:scale-90"
                    >
                        <X size={19} />
                    </button>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                <div
                    className={`min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 sm:[scrollbar-gutter:stable] ${thinScroll}`}
                >
                    <label className="block space-y-2">
                        <span className="text-sm font-bold">Event name</span>
                        <input
                            name="title"
                            value={form.title}
                            onChange={onFieldChange}
                            placeholder="e.g. Weekend pottery workshop"
                            required
                            maxLength={100}
                            className={inputBase}
                        />
                    </label>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block space-y-2">
                            <span className="text-sm font-bold">State</span>
                            <div className="relative">
                                <select
                                    name="state"
                                    value={form.state || ''}
                                    onChange={(event) => {
                                        onFieldChange(event);
                                        onFieldChange({ target: { name: 'district', value: '' } });
                                    }}
                                    className={`${inputBase} appearance-none pr-11`}
                                >
                                    <option value="">Select state</option>
                                    {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                                <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#11192f]/50" />
                            </div>
                        </label>
                        <label className="block space-y-2">
                            <span className="text-sm font-bold">District</span>
                            <div className="relative">
                                <select name="district" value={form.district || ''} onChange={onFieldChange} required className={`${inputBase} appearance-none pr-11`}>
                                    <option value="">Select district</option>
                                    {districtOptionsForState(form.state).map((district) => <option key={district} value={district}>{district}</option>)}
                                </select>
                                <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#11192f]/50" />
                            </div>
                            <span className="block text-xs text-[#11192f]/50">Choose {ALL_INDIA} for an event open across the country.</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block space-y-2">
                            <span className="text-sm font-bold">Date</span>
                            <input
                                name="date"
                                type="date"
                                value={form.date}
                                onChange={onFieldChange}
                                inputMode="none"
                                required
                                min={minDate}
                                onKeyDown={(event) => {
                                    if (/^[0-9]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Delete') {
                                        event.preventDefault();
                                    }
                                }}
                                onPaste={(event) => event.preventDefault()}
                                onDrop={(event) => event.preventDefault()}
                                className={inputBase}
                            />
                            <span className="block text-xs text-[#11192f]/50">Choose today or a future date from the calendar. Typing is disabled.</span>
                        </label>

                        <label className="block space-y-2">
                            <span className="text-sm font-bold">
                                Time <span className="font-normal text-[#11192f]/45">(optional)</span>
                            </span>
                            <div className="grid grid-cols-[1fr_auto_1fr_1.2fr] items-center gap-2">
                                <input
                                    name="timeHour"
                                    type="text"
                                    inputMode="numeric"
                                    value={form.timeHour || ''}
                                    onChange={onFieldChange}
                                    placeholder="hh"
                                    aria-label="Hour, 1 to 12"
                                    maxLength={2}
                                    className={`${inputBase} text-center`}
                                />
                                <span className="font-bold text-[#11192f]/50">:</span>
                                <input
                                    name="timeMinute"
                                    type="text"
                                    inputMode="numeric"
                                    value={form.timeMinute || ''}
                                    onChange={onFieldChange}
                                    placeholder="mm"
                                    aria-label="Minutes, 00 to 59"
                                    maxLength={2}
                                    className={`${inputBase} text-center`}
                                />
                                <div className="relative">
                                    <select
                                        name="timePeriod"
                                        value={form.timePeriod || 'AM'}
                                        onChange={onFieldChange}
                                        aria-label="AM or PM"
                                        className={`${inputBase} appearance-none pr-9 font-semibold`}
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#11192f]/50" />
                                </div>
                            </div>
                            <span className="block text-xs text-[#11192f]/50">Enter a 12-hour time and select AM or PM.</span>
                        </label>
                    </div>

                    <label className="block space-y-2">
                        <span className="text-sm font-bold">Venue</span>
                        <input
                            name="venue"
                            value={form.venue}
                            onChange={onFieldChange}
                            placeholder="e.g. Town Hall, Tiruppur"
                            required
                            maxLength={120}
                            className={inputBase}
                        />
                    </label>

                    <label className="block space-y-2">
                        <span className="text-sm font-bold">
                            Contact phone <span className="font-normal text-[#11192f]/45">(optional)</span>
                        </span>
                        <input
                            name="contactPhone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            value={form.contactPhone || ''}
                            onChange={onFieldChange}
                            placeholder="10-digit phone number"
                            maxLength={10}
                            pattern="[0-9]{10}"
                            className={inputBase}
                        />
                        <span className="block text-xs text-[#11192f]/50">Shown to people who open your event details.</span>
                    </label>

                    <label className="block space-y-2">
                        <span className="text-sm font-bold">
                            Registration link <span className="font-normal text-[#11192f]/45">(optional)</span>
                        </span>
                        <input
                            name="registrationUrl"
                            type="url"
                            inputMode="url"
                            value={form.registrationUrl || ''}
                            onChange={onFieldChange}
                            placeholder="https://forms.example.com/your-event"
                            maxLength={2048}
                            className={inputBase}
                        />
                        <span className="block text-xs text-[#11192f]/50">People can open this organiser registration form from the event details.</span>
                    </label>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SearchSelect
                            id="event-category"
                            label="Category"
                            options={categories}
                            selected={selectedCategory ? [selectedCategory] : []}
                            onSelect={(category) => onFieldChange({ target: { name: 'category', value: category } })}
                            placeholder="Search or add a category"
                            allowCustom
                            customLabel={(category) => `+ Add "${category}" as a new category`}
                            helperText="Search the list or type a new category and add it."
                        />
                        <SearchSelect
                            id="event-sector"
                            label="Sector"
                            options={sectors}
                            selected={selectedSector ? [selectedSector] : []}
                            onSelect={(sector) => {
                                if (sector !== form.sector) {
                                    onFieldChange({ target: { name: 'specialty', value: '' } });
                                }
                                onFieldChange({ target: { name: 'sector', value: sector } });
                            }}
                            placeholder="Search or add a sector"
                            allowCustom
                            customLabel={(sector) => `+ Add "${sector}" as a new sector`}
                            helperText="Search the list or type a new sector and add it."
                        />
                    </div>

                    <SearchSelect
                        id="event-specialty"
                        label={`${selectedSector} specialty or activity`}
                        options={sectorSpecialties[selectedSector] || []}
                        selected={form.specialty ? [form.specialty] : []}
                        onSelect={(specialty) => onFieldChange({ target: { name: 'specialty', value: specialty } })}
                        placeholder={`Search or add a ${selectedSector.toLowerCase()} activity`}
                        allowCustom
                        customLabel={(specialty) => `+ Add "${specialty}" as a new activity`}
                        helperText={`Choose an activity within ${selectedSector}, or type and add your own.`}
                    />

                    {/* Description + smart suggestions */}
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-[#11192f]/10 bg-white p-3.5 sm:p-4">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#526783]">
                                <Sparkles size={14} />
                                Suggestions
                            </div>
                            <p className="mt-1 text-xs text-[#11192f]/55">
                                Tap a suggestion to add it to your details below.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {currentSuggestions.map((suggestion) => {
                                    const added = description.includes(`• ${suggestion}`);
                                    const tooLong = !added && `${description.trim()}\n• ${suggestion}`.length > DESCRIPTION_MAX;
                                    return (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            disabled={added || tooLong}
                                            onClick={() => handleSelectSuggestion(suggestion)}
                                            className={`inline-flex items-start gap-1.5 rounded-2xl border px-3 py-1.5 text-left text-xs font-medium transition duration-200 active:scale-95 disabled:active:scale-100 ${added
                                                ? 'border-[#526783]/40 bg-[#f4f7fb] text-[#46536f]'
                                                : 'border-[#11192f]/10 bg-[#fbfcfe] text-[#11192f] hover:border-[#526783] hover:bg-[#f4f7fb] disabled:opacity-50'
                                                }`}
                                        >
                                            {added ? <Check size={13} className="mt-0.5 shrink-0" /> : <span aria-hidden="true">+</span>}
                                            <span>{suggestion}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <label className="block space-y-2">
                            <span className="flex items-baseline justify-between gap-2 text-sm font-bold">
                                <span>
                                    Event details <span className="font-normal text-[#11192f]/45">(optional)</span>
                                </span>
                                <span className="text-xs font-medium text-[#11192f]/45">
                                    {description.length}/{DESCRIPTION_MAX}
                                </span>
                            </span>
                            <textarea
                                name="description"
                                value={description}
                                onChange={onFieldChange}
                                placeholder="What will people experience at your event?"
                                rows={4}
                                maxLength={DESCRIPTION_MAX}
                                className={`${inputBase} resize-y leading-6`}
                            />
                        </label>
                    </div>

                    {/* Mobile verification */}
                    <Panel
                        icon={MessageCircle}
                        title="Mobile verification"
                        badge={
                            otpState === 'verified' && (
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#56dfff] px-2.5 py-1 text-xs font-bold text-[#365b72]">
                                    <Check size={13} />
                                    Verified
                                </span>
                            )
                        }
                    >
                        <p className="mt-2 text-sm leading-6 text-[#11192f]/55">
                            Demo only: the test code appears on this screen. No real SMS is sent.
                        </p>

                        <label className="mt-4 block space-y-2">
                            <span className="text-sm font-semibold">Your mobile number</span>
                            <input
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                value={mobile}
                                disabled={otpState === 'verified'}
                                onChange={handleMobileChange}
                                placeholder="10-digit mobile number"
                                maxLength={10}
                                required
                                className="w-full rounded-xl border border-[#11192f]/10 bg-[#fbfcfe] px-4 py-3 text-sm text-[#11192f] outline-none transition duration-200 focus:border-[#50627e] disabled:opacity-60"
                            />
                        </label>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            {otpState !== 'verified' && (
                                <button
                                    type="button"
                                    onClick={sendDemoOtp}
                                    disabled={otpState === 'sending' || otpSeconds > 0 || mobile.length !== 10}
                                    className={`${btnPrimary} px-5 py-3 text-sm`}
                                >
                                    {otpSeconds > 0
                                        ? `Resend in ${otpSeconds}s`
                                        : otpState === 'sending'
                                            ? 'Generating code…'
                                            : otpState === 'sent'
                                                ? 'Resend code'
                                                : 'Send demo code'}
                                </button>
                            )}

                            {otpState === 'sent' && (
                                <>
                                    <input
                                        aria-label="6-digit demo code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={otp}
                                        onChange={handleOtpChange}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                if (otp.length === 6) verifyDemoOtp();
                                            }
                                        }}
                                        placeholder="6-digit code"
                                        maxLength={6}
                                        className="min-w-0 flex-1 rounded-xl border border-[#11192f]/10 bg-[#fbfcfe] px-4 py-3 text-sm text-[#11192f] outline-none transition duration-200 focus:border-[#50627e]"
                                    />
                                    <button
                                        type="button"
                                        onClick={verifyDemoOtp}
                                        disabled={otp.length !== 6}
                                        className="rounded-full border border-[#11192f]/15 px-5 py-3 text-sm font-bold text-[#11192f] transition duration-200 hover:bg-[#f4f7fb] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Verify
                                    </button>
                                </>
                            )}
                        </div>

                        {otpMessage && (
                            <p
                                aria-live="polite"
                                className={`mt-3 flex items-start gap-2 text-sm leading-5 ${otpState === 'verified' ? 'text-green-800' : 'text-amber-800'}`}
                            >
                                {otpState === 'verified' && <Check size={15} className="mt-0.5 shrink-0" />}
                                {otpMessage}
                            </p>
                        )}
                    </Panel>

                    {/* Live video verification */}
                    <Panel icon={Camera} title="Live video check">
                        <p className="mt-2 text-sm leading-6 text-[#11192f]/55">
                            Look straight, then turn left, then turn right, all within 30 seconds. This needs camera permission.
                        </p>

                        {faceState === 'scanning' || faceState === 'starting' ? (
                            <div className="mt-4 overflow-hidden rounded-xl bg-[#11192f] p-3">
                                <div className="relative overflow-hidden rounded-lg bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="aspect-video w-full -scale-x-100 object-cover"
                                    />
                                    {faceState === 'scanning' && (
                                        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff5577]" />
                                            REC · {faceSecondsLeft}s
                                        </span>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-[#11192f]/85 px-3 py-3 text-center text-sm font-bold text-white">
                                        {faceState === 'starting'
                                            ? 'Starting camera…'
                                            : faceSteps[faceStep] || 'Check complete'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-2 py-3" aria-hidden="true">
                                    {faceSteps.map((_, index) => (
                                        <span
                                            key={index}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${index < faceStep
                                                ? 'w-6 bg-[#ff5577]'
                                                : index === faceStep
                                                    ? 'w-6 bg-white/70'
                                                    : 'w-3 bg-white/25'
                                                }`}
                                        />
                                    ))}
                                </div>

                                <p className="pb-3 text-center text-sm text-white/75">
                                    {faceState === 'scanning' ? 'Complete all 3 steps within 30 seconds' : 'Preparing face check…'}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        stopCamera();
                                        setFaceState('idle');
                                    }}
                                    className="w-full rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
                                >
                                    Stop camera
                                </button>
                            </div>
                        ) : faceState === 'verified' ? (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-start gap-2 rounded-xl bg-[#56dfff] p-3.5 text-sm font-semibold text-[#365b72]">
                                    <ShieldCheck size={18} className="shrink-0" />
                                    <span>{faceMessage}</span>
                                </div>

                                {clip ? (
                                    <video
                                        src={clip.url}
                                        controls
                                        muted
                                        playsInline
                                        className="aspect-video w-full -scale-x-100 rounded-xl bg-black object-cover"
                                    />
                                ) : (
                                    <p className="text-sm text-[#526783]">Saving your video…</p>
                                )}

                                <button
                                    type="button"
                                    onClick={onRetake}
                                    className="rounded-full border border-[#11192f]/15 px-4 py-2 text-sm font-semibold text-[#11192f] transition hover:bg-[#f4f7fb] active:scale-95"
                                >
                                    Retake video
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={startFaceCheck}
                                    className={`${btnPrimary} mt-4 px-5 py-3 text-sm`}
                                >
                                    <Camera size={16} />
                                    Start video check
                                </button>
                                {faceMessage && <p className="mt-3 text-sm text-red-700">{faceMessage}</p>}
                            </>
                        )}
                    </Panel>

                    {/* Event image */}
                    <label className="block space-y-2">
                        <span className="text-sm font-bold">
                            Event image <span className="font-normal text-[#11192f]/45">(optional)</span>
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={chooseImage}
                            disabled={imageBusy}
                            className="block w-full rounded-xl border border-dashed border-[#11192f]/25 bg-white p-3 text-sm text-[#11192f] transition-colors file:mr-4 file:rounded-full file:border-0 file:bg-[#f4f7fb] file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#11192f] hover:border-[#526783] hover:file:bg-[#edf2f8] disabled:opacity-50"
                        />
                    </label>

                    {imageBusy && <p className="text-sm text-[#526783]">Preparing image…</p>}

                    {form.image && (
                        <div className="overflow-hidden rounded-xl border border-[#11192f]/10 bg-white p-2">
                            <img src={form.image} alt="Event preview" className="max-h-64 w-full rounded-lg object-cover" />
                            <button
                                type="button"
                                onClick={onRemoveImage}
                                className="mt-2 rounded-full border border-[#11192f]/10 px-4 py-2 text-sm font-semibold text-[#11192f] transition hover:bg-[#f2f5fa] active:scale-95"
                            >
                                Remove image
                            </button>
                        </div>
                    )}

                    <p className="flex items-center gap-1.5 text-xs font-medium text-[#526783]">
                        <Sparkles size={13} className="shrink-0" />
                        Adding an image creates an effective reach.
                    </p>

                    <p className="flex items-start gap-2 text-xs leading-5 text-[#11192f]/50">
                        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                        Demo mode: event details and your verification video stay in this browser. They are not uploaded to a server by this component.
                    </p>

                    <label className="flex items-start gap-3 rounded-xl border border-[#11192f]/10 bg-white p-4 text-sm leading-6">
                        <input
                            name="termsAccepted"
                            type="checkbox"
                            checked={Boolean(form.termsAccepted)}
                            onChange={onFieldChange}
                            required
                            className="mt-1 h-4 w-4 shrink-0 accent-[#315844]"
                        />
                        <span>
                            I agree to the Hapzo360{' '}
                            <Link to="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-bold text-[#315844] underline underline-offset-2">
                                Terms &amp; Conditions
                            </Link>
                            .
                        </span>
                    </label>

                    {formError && (
                        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {formError}
                        </p>
                    )}
                </div>

                {/* Fixed footer */}
                <div className="flex shrink-0 gap-3 border-t border-[#11192f]/10 bg-[#fbfcfe] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-full border border-[#11192f]/15 bg-white px-5 py-3.5 text-sm font-bold text-[#11192f] transition duration-200 hover:bg-[#f4f7fb] active:scale-[0.97]"
                    >
                        Cancel
                    </button>
                    <button type="submit" disabled={imageBusy} className={`${btnPrimary} flex-1 px-5 py-3.5 text-sm`}>
                        {imageBusy ? 'Preparing image…' : 'Publish event'}
                        <ArrowUpRight size={17} />
                    </button>
                </div>
            </form>
        </Modal>
    );
}
