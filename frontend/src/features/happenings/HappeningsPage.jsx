import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, MapPin, Search, Sparkles, Clock3, ArrowUpRight, Plus, X, Users, Ticket, Phone } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import AddEventModal from './AddEventModal';
import { DISTRICTS } from '../../data/indiaLocations';
import API_BASE_URL from '../../config/api';
import EventPulse from './EventCard';

const API_URL = import.meta.env.VITE_EVENTS_API_URL || '';
const ONLINE_EVENTS_API_URL = `${API_BASE_URL}/api/happenings/search`;
const EVENT_CACHE_KEY = 'happening.events.cache.v1';
const USER_EVENTS_KEY = 'happening.user-events.v1';
const HAPPENING_DISTRICTS = DISTRICTS['Tamil Nadu'] || [];
const categories = ['All events', 'Business', 'Community', 'Hackathon', 'Meetups', 'Workshops', 'Webinar', 'Conference', 'Expo'];
const TIME_FILTERS = [
  { value: 'Any time', label: 'Any time' },
  { value: 'Morning', label: 'Morning · 5 am–12 pm' },
  { value: 'Afternoon', label: 'Afternoon · 12–5 pm' },
  { value: 'Evening', label: 'Evening · 5–9 pm' },
  { value: 'Night', label: 'Night · 9 pm–5 am' },
];
const OTP_VALID_MS = 5 * 60 * 1000;
const EXIT_MS = 200;
let faceLandmarkerPromise;

/* ---------- Tailwind class presets ---------- */
const ease = 'ease-[cubic-bezier(0.22,1,0.36,1)]';
const thinScroll = '[scrollbar-width:thin] [scrollbar-color:rgba(11,18,32,0.2)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#0b1220]/25 hover:[&::-webkit-scrollbar-thumb]:bg-[#0b1220]/40';
const hideScroll = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#1f46c9] font-bold text-white transition duration-200 hover:bg-[#14308f] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafbfc] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none';
const skeleton = 'animate-pulse bg-[#e8ebf0] motion-reduce:animate-none';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Helpers ---------- */
function loadFaceLandmarker() {
  if (!faceLandmarkerPromise) faceLandmarkerPromise = FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm')
    .then(fileset => FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' }, runningMode: 'VIDEO', numFaces: 1 }));
  return faceLandmarkerPromise;
}
function readEvents(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && (item.title || item.name)) : [];
  } catch { return []; }
}
function saveEvents(key, events) {
  try { window.localStorage.setItem(key, JSON.stringify(events)); return true; } catch { return false; }
}

function mergeEvents(...groups) {
  const byId = new Map();
  groups.flat().forEach((event, index) => byId.set(event.id || `${event.title || event.name}-${index}`, event));
  const sortKey = event => {
    const time = new Date(event.date || event.startDate || '').getTime();
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  };
  return [...byId.values()].sort((a, b) => sortKey(a) - sortKey(b));
}

const titleCase = s => String(s).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function formatDate(value) {
  if (!value) return 'Date to be announced';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/* Reads the start clock time ("6:30 PM" or "18:30") from an event, if it has one. */
function eventClock(event) {
  const rawDate = typeof event.date === 'string' ? event.date : event.date?.when;
  const value = String(event.time || event.startTime || rawDate || '').trim();
  const twelve = value.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
  if (twelve) {
    let hour = Number(twelve[1]) % 12;
    if (/p/i.test(twelve[3])) hour += 12;
    return { hour, minute: Number(twelve[2] || 0) };
  }
  const h24 = value.match(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)(?:\D|$)/);
  return h24 ? { hour: Number(h24[1]), minute: Number(h24[2]) } : null;
}
const eventHour = event => eventClock(event)?.hour ?? null;

function parseEventDate(event) {
  const raw = event.date || event.startDate;
  if (!raw) return null;
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const { hour, minute } = eventClock(event) || { hour: 9, minute: 0 };
    date = new Date(`${raw}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  } else {
    date = new Date(raw);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesTimeFilter(event, filter) {
  if (filter === 'Any time') return true;
  const hour = eventHour(event);
  if (hour === null) return event.scraped === true;
  if (filter === 'Morning') return hour >= 5 && hour < 12;
  if (filter === 'Afternoon') return hour >= 12 && hour < 17;
  if (filter === 'Evening') return hour >= 17 && hour < 21;
  return hour >= 21 || hour < 5;
}
const dayKey = date => date.toLocaleDateString('en-CA');
function registrationCount(event) {
  if (Number.isFinite(Number(event.registeredCount))) return Math.min(20, Math.max(0, Number(event.registeredCount)));
  let hash = 0;
  for (const char of String(event.id || event.title || event.name || 'event')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 21;
}
const stripHeavy = events => events.map(({ verifiedSnapshots, ...rest }) => rest);

/* Flips to true one frame after mount so Tailwind transitions can play. */
function useEntered() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setOn(true)));
    return () => window.cancelAnimationFrame(id);
  }, []);
  return on;
}

function EventBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="ev-grid" />
      <div className="ev-atmosphere" />
      <EventPulse />
    </div>
  );
}

/** Scrolling ticker tape of real listings. */
function TickerTape({ events, onOpen }) {
  const now = Date.now();
  const upcoming = events.filter(event => { const date = parseEventDate(event); return date && date.getTime() >= now - 86400000; });
  const rows = (upcoming.length >= 3 ? upcoming : events).slice(0, 12);
  if (rows.length < 3) return null;

  const group = suffix => (
    <div className="ev-tape-group" key={suffix} aria-hidden={suffix === 'b' ? 'true' : undefined}>
      {rows.map((event, index) => (
        <button key={`${suffix}-${event.id ?? index}`} type="button" tabIndex={suffix === 'b' ? -1 : undefined} onClick={() => onOpen(event)} className="ev-tape-item">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f2b53d]" />
          <span className="font-bold text-[#f2b53d]">{event.category || 'Community'}</span>
          <span className="max-w-[320px] truncate text-white">{event.title || event.name}</span>
          <span className="text-white/50">{formatDate(event.date || event.startDate)}</span>
          {(event.venue || event.location) && <span className="max-w-[200px] truncate text-white/45">{event.venue || event.location}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className="ev-tape" role="marquee" aria-label="Upcoming events">
      <div className="ev-tape-track">{group('a')}{group('b')}</div>
    </div>
  );
}

const STYLES = `
.ev-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(11,18,32,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(11,18,32,.05) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:linear-gradient(to bottom,#000,transparent 82%);mask-image:linear-gradient(to bottom,#000,transparent 82%)}
.ev-atmosphere{position:absolute;inset:0;background:radial-gradient(ellipse at 50% -10%,rgba(31,70,201,.07),transparent 55%)}
.ev-event-card{border-radius:20px;background-clip:padding-box;box-shadow:0 1px 2px rgba(11,18,32,.05),0 10px 28px -14px rgba(11,18,32,.16)}
.ev-event-card:hover{box-shadow:0 1px 2px rgba(11,18,32,.06),0 18px 38px -16px rgba(11,18,32,.22)}

.ev-tape{overflow:hidden;border-block:1px solid rgba(11,18,32,.14);background:#0b1220;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.ev-tape-track{display:flex;width:max-content;animation:ev-marquee 80s linear infinite}
.ev-tape:hover .ev-tape-track,.ev-tape:focus-within .ev-tape-track{animation-play-state:paused}
.ev-tape-group{display:flex;flex-shrink:0}
.ev-tape-item{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;font-size:14px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.1);transition:background .2s}
.ev-tape-item:hover{background:rgba(255,255,255,.08)}
@keyframes ev-marquee{to{transform:translateX(-50%)}}

@media (prefers-reduced-motion:reduce){
  .ev-tape-track{animation:none!important}
  .ev-tape{overflow-x:auto}
}
`;

/* ---------- Small components ---------- */
function Reveal({ delay = 0, className = '', children }) {
  const on = useEntered();
  return (
    <div
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition duration-500 ${ease} motion-reduce:transition-none ${on ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}

function Modal({ closing, onBackdrop, labelledBy, className = '', children }) {
  const entered = useEntered();
  const show = entered && !closing;
  return (
    <div
      onMouseDown={event => { if (event.target === event.currentTarget) onBackdrop(); }}
      className={`fixed inset-0 z-50 flex items-end justify-center bg-[#0b1220]/65 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:items-center sm:p-5 ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#fafbfc] text-[#0b1220] shadow-2xl transition duration-300 ${ease} motion-reduce:transition-none sm:max-h-[90dvh] sm:rounded-[1.75rem] ${show ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-[0.98] opacity-0'} ${className}`}
      >
        {children}
      </section>
    </div>
  );
}

function Toast({ message }) {
  const on = useEntered();
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 rounded-2xl bg-[#0b1220] px-5 py-3.5 text-center text-sm font-semibold text-white shadow-2xl transition duration-300 ${ease} motion-reduce:transition-none ${on ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      {message}
    </div>
  );
}

function eventImageUrl(event) {
  const candidate = event?.image ?? event?.imageUrl ?? event?.image_url ?? event?.thumbnail ?? event?.thumbnailUrl ?? event?.thumbnail_url ?? event?.images;
  const firstUsable = value => {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) return value.map(firstUsable).find(Boolean) || '';
    if (value && typeof value === 'object') {
      return firstUsable(value.url || value.contentUrl || value.thumbnailUrl || value.src || value.image);
    }
    return '';
  };
  return firstUsable(candidate);
}

function venueLabel(event) {
  const value = event?.venue || event?.location;
  if (typeof value !== 'string') return value || '';
  const seen = new Set();
  return value.split(',').map(part => part.trim()).filter(part => {
    const key = part.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(', ');
}

function EventImage({ src, alt, category = 'Community', className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setLoaded(false); setFailed(false); }, [src]);
  if (!src || failed) {
    const kind = String(category).toLowerCase();
    const visual = /hackathon|technology|tech/.test(kind)
      ? { background: '#e9eefb', foreground: '#1f46c9', icon: Sparkles }
      : /business/.test(kind)
        ? { background: '#eef0f4', foreground: '#4b5565', icon: Ticket }
        : /meetup|community/.test(kind)
          ? { background: '#eceff4', foreground: '#3d4a66', icon: Users }
          : { background: '#e9edf2', foreground: '#5b6575', icon: CalendarDays };
    const VisualIcon = visual.icon;
    return (
      <div className={`relative grid h-full w-full place-items-center overflow-hidden ${className}`} style={{ backgroundColor: visual.background }}>
        <div aria-hidden="true" className="absolute inset-x-[14%] top-1/2 h-px bg-[#0b1220]/[.08]" />
        <div aria-hidden="true" className="absolute inset-y-[18%] left-1/2 w-px bg-[#0b1220]/[.08]" />
        <span className="relative grid h-[68px] w-[68px] place-items-center rounded-[20px] border border-white/80 bg-white/65 shadow-sm" style={{ color: visual.foreground }}>
          <VisualIcon size={30} strokeWidth={1.6} />
        </span>
      </div>
    );
  }
  return (
    <>
      {!loaded && <div className={`absolute inset-0 ${skeleton}`} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </>
  );
}

const EventCard = memo(function EventCard({ event, index, onOpen }) {
  const title = event.title || event.name;
  return (
    <Reveal delay={Math.min(index, 8) * 45} className="flex">
      <article
        role="button"
        tabIndex={0}
        onClick={() => onOpen(event)}
        onKeyDown={key => { if (key.key === 'Enter' || key.key === ' ') { key.preventDefault(); onOpen(event); } }}
        className={`ev-event-card group flex w-full cursor-pointer flex-col overflow-hidden rounded-[20px] border border-[#0b1220]/10 bg-white text-[#0b1220] transition duration-300 ${ease} hover:-translate-y-1 hover:border-[#1f46c9]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] active:translate-y-0 motion-reduce:transition-none`}
      >
        <div className="relative h-52 overflow-hidden bg-[#e9eefb] sm:h-56">
          <EventImage src={eventImageUrl(event)} category={event.category} alt={title || 'Event'} className="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
          <div className="absolute left-4 top-4 rounded-full bg-[#fafbfc]/95 px-3 py-2 text-xs font-bold text-[#0b1220] shadow-sm backdrop-blur">
            {event.category || 'Community'}
          </div>
          {event.createdByUser && (
            <div className="absolute right-4 top-4 rounded-full bg-[#1f46c9] px-3 py-2 text-xs font-bold text-white">Community event</div>
          )}
          {event.scraped && (
            <div className="absolute right-4 top-4 rounded-full bg-[#f2b53d] px-3 py-2 text-xs font-bold text-[#0b1220]">{event.sourceName || 'Found online'}</div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1f46c9]">
            <CalendarDays size={15} />
            {formatDate(event.date || event.startDate)}
          </div>

          <h3 className="line-clamp-2 text-xl font-extrabold leading-snug tracking-[-0.03em] transition-colors duration-300 group-hover:text-[#14308f]">{title}</h3>

          <div className="mt-4 space-y-2.5 text-sm text-[#0b1220]/65">
            {(event.time || event.startTime) && (
              <div className="flex items-start gap-2.5">
                <Clock3 size={16} className="mt-0.5 shrink-0 text-[#5b6575]" />
                <span>{event.time || event.startTime}</span>
              </div>
            )}
            {venueLabel(event) && (
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#5b6575]" />
                <span className="line-clamp-2">{venueLabel(event)}</span>
              </div>
            )}
          </div>

          {event.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#0b1220]/60">{event.description}</p>}

          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between gap-3 border-t border-[#0b1220]/10 pt-5">
              {event.scraped ? (
                <span className="text-sm font-semibold text-[#0b1220]/70">
                  {event.price || event.mode || 'See details'}
                </span>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[#0b1220]/55">
                  <Users size={16} className="text-[#5b6575]" />
                  <strong className="text-[#0b1220]">{registrationCount(event)}</strong>
                  <span>registered</span>
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1f46c9] transition-all duration-300 group-hover:gap-2.5">
                Explore
                <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
            {event.scraped && event.sourceName && <p className="mt-2 truncate text-xs text-[#0b1220]/45">Source: {event.sourceName}</p>}
          </div>
        </div>
      </article>
    </Reveal>
  );
});

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#0b1220]/10 bg-white">
      <div className={`h-52 sm:h-56 ${skeleton}`} />
      <div className="space-y-3 p-6">
        <div className={`h-4 w-1/3 rounded-full ${skeleton}`} />
        <div className={`h-6 w-4/5 rounded-full ${skeleton}`} />
        <div className={`h-4 w-2/3 rounded-full ${skeleton}`} />
        <div className={`h-4 w-1/2 rounded-full ${skeleton}`} />
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, badge, children }) {
  return (
    <div className="rounded-2xl border border-[#0b1220]/10 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Icon size={17} className="text-[#1f46c9]" />
        {title}
        {badge}
      </div>
      {children}
    </div>
  );
}

/* ---------- Main component ---------- */
export default function Happening() {
  const [events, setEvents] = useState(() => mergeEvents(readEvents(EVENT_CACHE_KEY), readEvents(USER_EVENTS_KEY)));
  const [onlineEvents, setOnlineEvents] = useState([]);
  const [loading, setLoading] = useState(() => readEvents(EVENT_CACHE_KEY).length === 0);
  const [onlineLoading, setOnlineLoading] = useState(true);
  const [onlineAvailable, setOnlineAvailable] = useState(null);
  const [onlineMeta, setOnlineMeta] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [district, setDistrict] = useState('Coimbatore');
  const [category, setCategory] = useState('All events');
  const [query, setQuery] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('Any time');
  const deferredQuery = useDeferredValue(query);
  const [addOpen, setAddOpen] = useState(false);
  const [addClosing, setAddClosing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', venue: '', category: 'Community', description: '', image: '' });
  const [formError, setFormError] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [toast, setToast] = useState('');

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpState, setOtpState] = useState('idle'); // idle, sending, sent, verified
  const [otpMessage, setOtpMessage] = useState('');
  const [otpSeconds, setOtpSeconds] = useState(0);
  const otpIssuedAtRef = useRef(0);

  const [faceState, setFaceState] = useState('idle'); // idle, starting, scanning, verified
  const [faceStep, setFaceStep] = useState(0);
  const [faceMessage, setFaceMessage] = useState('');
  const [capturedSnapshots, setCapturedSnapshots] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const faceFrameRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const poseSinceRef = useRef(0);
  const closeTimerRef = useRef(0);
  const detailTimerRef = useRef(0);

  // Smooth anchor scrolling, using Tailwind's own class on <html>.
  useEffect(() => {
    document.documentElement.classList.add('scroll-smooth');
    return () => document.documentElement.classList.remove('scroll-smooth');
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (otpSeconds <= 0) return undefined;
    const timer = window.setInterval(() => setOtpSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpSeconds > 0]);

  /* ---------- Camera ---------- */
  const stopCamera = useCallback(() => {
    window.cancelAnimationFrame(faceFrameRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    faceLandmarkerPromise = null;
  }, []);

  useEffect(() => () => { stopCamera(); window.clearTimeout(closeTimerRef.current); window.clearTimeout(detailTimerRef.current); }, [stopCamera]);
  useEffect(() => { if (faceState === 'verified') stopCamera(); }, [faceState, stopCamera]);

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      const width = 240;
      const ratio = (video.videoHeight || 3) / (video.videoWidth || 4);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = Math.round(width * ratio);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedSnapshots(prev => [...prev, canvas.toDataURL('image/jpeg', 0.6)]);
    } catch { /* ignore snapshot error */ }
  };

  useEffect(() => {
    if (faceState !== 'scanning' || !videoRef.current || !landmarkerRef.current) return undefined;
    let live = true;
    const scan = () => {
      if (!live) return;
      const video = videoRef.current;
      if (video?.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarkerRef.current?.detectForVideo(video, performance.now());
        const landmarks = result?.faceLandmarks?.[0];
        if (landmarks) {
          const nose = landmarks[1]?.x; const leftEye = landmarks[33]?.x; const rightEye = landmarks[263]?.x;
          const center = (leftEye + rightEye) / 2; const offset = nose - center;
          const expected = faceStep === 0 ? Math.abs(offset) < 0.045 : faceStep === 1 ? offset > 0.075 : offset < -0.075;
          if (expected) {
            if (!poseSinceRef.current) poseSinceRef.current = performance.now();
            if (performance.now() - poseSinceRef.current >= 650) {
              poseSinceRef.current = 0;
              captureSnapshot();
              if (faceStep >= 2) {
                setFaceStep(3);
                setFaceState('verified');
                setFaceMessage('Head-turn check complete.');
              } else {
                setFaceStep(faceStep + 1);
              }
            }
          } else poseSinceRef.current = 0;
        } else poseSinceRef.current = 0;
      }
      faceFrameRef.current = window.requestAnimationFrame(scan);
    };
    faceFrameRef.current = window.requestAnimationFrame(scan);
    return () => { live = false; window.cancelAnimationFrame(faceFrameRef.current); };
  }, [faceState, faceStep]);

  const startFaceCheck = async () => {
    setFaceMessage(''); setFaceStep(0); setFaceState('starting'); poseSinceRef.current = 0; lastVideoTimeRef.current = -1; setCapturedSnapshots([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      const landmarker = await loadFaceLandmarker(); landmarkerRef.current = landmarker;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setFaceState('scanning');
    } catch (error) {
      stopCamera(); setFaceState('idle');
      setFaceMessage(error?.name === 'NotAllowedError' ? 'Allow camera access in your browser to continue.' : 'The camera or face-check model could not start. Check your connection and try again.');
    }
  };

  /* ---------- Demo OTP ---------- */
  const sendDemoOtp = () => {
    if (!/^\d{10}$/.test(mobile)) { setOtpMessage('Enter a valid 10-digit mobile number.'); return; }
    setOtpState('sending'); setOtpMessage(''); setOtp('');
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomCode);
    window.setTimeout(() => {
      otpIssuedAtRef.current = Date.now();
      setOtpState('sent');
      setOtpSeconds(30);
      setOtpMessage(`Demo code: ${randomCode}`);
    }, 400);
  };

  const verifyDemoOtp = () => {
    if (Date.now() - otpIssuedAtRef.current > OTP_VALID_MS) { setOtpMessage('This code has expired. Send a new one.'); return; }
    if (otp !== generatedOtp) { setOtpMessage('That code does not match. Type the demo code shown above.'); return; }
    setOtpState('verified'); setOtpSeconds(0); setOtpMessage('Mobile number verified.');
  };

  /* ---------- Data loading ---------- */
  useEffect(() => {
    if (!API_URL) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const load = () => fetch(API_URL, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Events could not be loaded'); return response.json(); })
      .then(data => {
        const remote = Array.isArray(data) ? data : (data.events || []);
        const next = mergeEvents(remote, readEvents(USER_EVENTS_KEY));
        setEvents(next); saveEvents(EVENT_CACHE_KEY, stripHeavy(next)); setLoadFailed(false);
      })
      .catch(error => { if (error.name !== 'AbortError') setLoadFailed(true); })
      .finally(() => setLoading(false));
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  // Online (crawled) events. The server ignores `date`, and day filtering is done
  // client-side in `filteredEvents`, so only the district triggers a request.
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ district, state: 'Tamil Nadu' });

    setOnlineLoading(true);
    setOnlineEvents([]);
    setOnlineMeta(null);

    fetch(`${ONLINE_EVENTS_API_URL}?${params}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Online event search is unavailable');
        setOnlineEvents(Array.isArray(data.events) ? data.events : []);
        setOnlineAvailable(data.available !== false);
        setOnlineMeta({ nearby: Boolean(data.nearby), city: data.city || '' });
      })
      .catch(error => {
        if (error.name === 'AbortError') return;
        setOnlineEvents([]);
        setOnlineAvailable(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOnlineLoading(false);
      });

    return () => controller.abort();
  }, [district]);

  useEffect(() => {
    if (!selectedEvent?.url || selectedEvent.createdByUser || selectedEvent.scraped) return undefined;
    const controller = new AbortController();
    setDetailsLoading(true);
    fetch(`${API_BASE_URL}/api/event-details?url=${encodeURIComponent(selectedEvent.url)}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Details unavailable'); return response.json(); })
      .then(extra => setSelectedEvent(current => current ? { ...current, ...extra, venue: current.venue || extra.venue, date: current.date || extra.date } : current))
      .catch(() => { })
      .finally(() => setDetailsLoading(false));
    return () => controller.abort();
  }, [selectedEvent?.id, selectedEvent?.url]);

  const allEvents = useMemo(() => mergeEvents(events, onlineEvents), [events, onlineEvents]);

  const filteredEvents = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return allEvents.filter(event => {
      const text = `${event.title || event.name || ''} ${event.venue || event.location || ''} ${event.category || ''} ${event.description || ''}`.toLowerCase();
      const matchesCategory = category === 'All events' || (event.category || '').toLowerCase().includes(category.toLowerCase());
      if (dayFilter) {
        const date = parseEventDate(event);
        if (!date || dayKey(date) !== dayFilter) return false;
      }
      return matchesCategory && text.includes(needle) && matchesTimeFilter(event, timeFilter);
    });
  }, [allEvents, category, deferredQuery, dayFilter, timeFilter]);

  /* ---------- Image upload ---------- */
  const chooseImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('Choose an image file.'); return; }
    setImageBusy(true); setFormError('');
    try {
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = source;
      });
      const scale = Math.min(1, 1200 / image.width); const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      setForm(current => ({ ...current, image: canvas.toDataURL('image/jpeg', 0.78) }));
    } catch { setFormError('Could not load this image. Try another one.'); }
    finally { setImageBusy(false); }
  };

  /* ---------- Modals ---------- */
  const openAdd = useCallback(() => { setFormError(''); setAddClosing(false); setAddOpen(true); }, []);
  const closeAdd = useCallback(() => {
    stopCamera(); setFaceState('idle'); setFaceStep(0); setFaceMessage('');
    setOtpState('idle'); setOtpSeconds(0); setOtp(''); setMobile(''); setOtpMessage(''); setCapturedSnapshots([]);
    setAddClosing(true);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => { setAddOpen(false); setAddClosing(false); }, EXIT_MS);
  }, [stopCamera]);
  const openDetails = useCallback(event => { window.clearTimeout(detailTimerRef.current); setDetailClosing(false); setSelectedEvent(event); }, []);
  const closeDetails = useCallback(() => {
    setDetailClosing(true);
    window.clearTimeout(detailTimerRef.current);
    detailTimerRef.current = window.setTimeout(() => { setSelectedEvent(null); setDetailClosing(false); }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (!addOpen && !selectedEvent) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = event => {
      if (event.key !== 'Escape') return;
      if (addOpen && !addClosing) closeAdd();
      else if (selectedEvent && !detailClosing) closeDetails();
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [addOpen, addClosing, selectedEvent, detailClosing, closeAdd, closeDetails]);

  const onFieldChange = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));

  const addEvent = event => {
    event.preventDefault(); setFormError('');
    if (otpState !== 'verified') { setFormError('Verify your mobile number with the demo code first.'); return; }
    if (faceState !== 'verified') { setFormError('Complete the camera head-turn check first.'); return; }

    const id = globalThis.crypto?.randomUUID?.() || `local-${Date.now()}`;
    const time = form.time || '12:00';
    const newEvent = {
      id: `happening-${id}`, title: form.title.trim(), date: new Date(`${form.date}T${time}:00+05:30`).toISOString(),
      time: form.time, venue: form.venue.trim(), category: form.category, description: form.description.trim(), image: form.image,
      registeredCount: Math.floor(Math.random() * 21), source: 'Community', createdByUser: true,
      verifiedSnapshots: capturedSnapshots
    };

    let stored = newEvent;
    let saved = saveEvents(USER_EVENTS_KEY, mergeEvents([stored], readEvents(USER_EVENTS_KEY)));
    let snapshotsDropped = false;
    if (!saved) {
      stored = { ...newEvent, verifiedSnapshots: [] };
      saved = saveEvents(USER_EVENTS_KEY, mergeEvents([stored], readEvents(USER_EVENTS_KEY)));
      snapshotsDropped = saved;
    }
    if (!saved) { setFormError('This device could not save the event. Free some browser storage and try again.'); return; }

    const next = mergeEvents([stored], events);
    setEvents(next); saveEvents(EVENT_CACHE_KEY, stripHeavy(next));
    setForm({ title: '', date: '', time: '', venue: '', category: 'Community', description: '', image: '' });
    closeAdd();
    setToast(snapshotsDropped ? 'Event published. Storage was full, so snapshots were not kept.' : 'Event published and saved on this device.');
  };

  const scrollToEvents = () => document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' });
  const pickDay = useCallback(key => { setDayFilter(key); if (key) document.getElementById('events-list')?.scrollIntoView({ behavior: 'smooth' }); }, []);
  const dayLabel = dayFilter ? formatDate(dayFilter) : '';

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-[#f5f6f8] text-[#0b1220] antialiased selection:bg-[#1f46c9]/25">
      <style>{STYLES}</style>
      <EventBackdrop />

      <main id="top" className="relative z-10">
        {/* Hero */}
          <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 md:py-20 lg:px-12">
          <div>
            <Reveal>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#0b1220]/15 bg-white px-4 py-2 text-sm font-semibold text-[#14308f]">
                <Sparkles size={14} />
                Your town, your plans
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="max-w-3xl text-[2.9rem] font-black leading-[1] tracking-[-0.065em] sm:text-7xl lg:text-[88px]">
                Good things
                <br />
                are happening<span className="text-[#1f46c9]">.</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#0b1220]/75 sm:text-lg">
                Discover the people, places and experiences happening in {district}.
                Your next favourite memory might be just around the corner.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button onClick={scrollToEvents} className="group inline-flex items-center gap-3 rounded-full bg-[#1f46c9] px-6 py-3.5 font-bold text-white shadow-lg shadow-[#1f46c9]/25 transition duration-200 hover:bg-[#14308f] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f6f8] motion-reduce:transition-none">
                  Explore what's on
                  <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
                <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-full border border-[#0b1220]/20 bg-white px-6 py-3.5 font-bold text-[#0b1220] transition duration-200 hover:bg-[#dfe6f8] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] motion-reduce:transition-none">
                  <Plus size={17} />
                  Add an event
                </button>
              </div>
            </Reveal>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#0b1220]/15 pt-6 text-sm text-[#0b1220]/75">
              <span className="flex items-center gap-2"><MapPin size={15} className="text-[#1f46c9]" />Events near {district}</span>
              <span className="flex items-center gap-2"><CalendarDays size={15} className="text-[#1f46c9]" />Discover what's next</span>
            </div>
          </div>

        </section>

        {/* Ticker tape of real listings */}
        {!loading && <TickerTape events={allEvents} onOpen={openDetails} />}

        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          {/* Search and filters */}
          <section id="events-list" className="scroll-mt-24 pt-12 sm:pt-16">
            <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="mb-3 text-sm font-bold text-[#1f46c9]">Find your people</p>
                <h2 className="text-3xl font-black tracking-[-0.055em] sm:text-4xl">What's on the calendar?</h2>
                <p className="mt-2 text-sm leading-6 text-[#0b1220]/75 sm:text-base">Community events and online listings for hackathons, meetups, expos, workshops, webinars and conferences.</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 self-start rounded-full border border-[#0b1220]/15 bg-white px-4 py-2.5 text-sm font-medium text-[#0b1220] md:self-auto">
                <MapPin size={15} className="text-[#1f46c9]" />
                <span className="sr-only">Choose a Tamil Nadu district</span>
                <select
                  value={district}
                  onChange={event => setDistrict(event.target.value)}
                  aria-label="Choose a Tamil Nadu district"
                  className="max-w-[190px] cursor-pointer bg-transparent text-[#0b1220] outline-none [&>option]:text-[#0b1220]"
                >
                  {HAPPENING_DISTRICTS.map(item => <option key={item} value={item}>{item}, Tamil Nadu</option>)}
                </select>
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-[#0b1220]/10 bg-white p-3 text-[#0b1220] shadow-xl shadow-[#0b1220]/10 sm:p-4">
              <label className="flex items-center gap-3 rounded-xl bg-[#f0f2f6] px-4 py-3.5 transition duration-200 focus-within:ring-2 focus-within:ring-[#1f46c9]">
                <Search size={19} className="shrink-0 text-[#5b6575]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search events, venues or experiences..."
                  aria-label="Search events"
                  className="w-full bg-transparent text-sm text-[#0b1220] outline-none placeholder:text-[#0b1220]/40 sm:text-base"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full p-1 transition hover:bg-[#0b1220]/10">
                    <X size={17} className="text-[#0b1220]/60" />
                  </button>
                )}
              </label>

              <div className={`-mx-1 mt-4 flex snap-x snap-proximity gap-2 overflow-x-auto px-1 pb-1 ${hideScroll}`}>
                {categories.map(item => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    aria-pressed={category === item}
                    className={`shrink-0 snap-start rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] motion-reduce:transition-none ${category === item
                      ? 'bg-[#1f46c9] text-white shadow-sm'
                      : 'border border-[#0b1220]/10 bg-white text-[#0b1220]/65 hover:border-[#1f46c9]/40 hover:bg-[#e9eefb]'
                      }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 border-t border-[#0b1220]/10 pt-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#0b1220]/60">
                  Event day
                  <input
                    type="date"
                    value={dayFilter}
                    onChange={event => setDayFilter(event.target.value)}
                    aria-label="Filter events by day"
                    className="mt-1.5 block w-full rounded-xl border border-[#0b1220]/10 bg-[#f0f2f6] px-3.5 py-3 text-sm font-medium text-[#0b1220] outline-none transition focus:border-[#1f46c9] focus:ring-2 focus:ring-[#1f46c9]/15"
                  />
                </label>
                <label className="block text-xs font-bold text-[#0b1220]/60">
                  Time of day
                  <select
                    value={timeFilter}
                    onChange={event => setTimeFilter(event.target.value)}
                    aria-label="Filter events by time of day"
                    className="mt-1.5 block w-full rounded-xl border border-[#0b1220]/10 bg-[#f0f2f6] px-3.5 py-3 text-sm font-medium text-[#0b1220] outline-none transition focus:border-[#1f46c9] focus:ring-2 focus:ring-[#1f46c9]/15"
                  >
                    {TIME_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </section>

          {/* Event listing */}
          <section className="pb-20 pt-10 sm:pt-12">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.045em] sm:text-3xl">
                  {category === 'All events' ? 'Coming up around town' : `${category} events`}
                </h2>
                <p className="mt-1 text-sm text-[#0b1220]/65">A little something for your next day out.</p>
                {onlineLoading ? (
                  <p className="mt-2 text-xs text-[#0b1220]/60">Searching online event listings for {district}… the first search for a city can take a moment.</p>
                ) : onlineAvailable === false ? (
                  <p className="mt-2 text-xs text-[#0b1220]/60">Online listings are temporarily unavailable. Community events are still shown.</p>
                ) : onlineEvents.length > 0 ? (
                  <p className="mt-2 text-xs text-[#0b1220]/60">
                    {onlineMeta?.nearby
                      ? `No Meetup listings for ${district}, so these are from ${titleCase(onlineMeta.city)}, the nearest city.`
                      : `Includes ${onlineEvents.length} event${onlineEvents.length === 1 ? '' : 's'} found online.`}
                  </p>
                ) : null}
                {dayFilter && (
                  <button onClick={() => setDayFilter('')} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#0b1220]/10 bg-white px-3.5 py-1.5 text-xs font-bold text-[#0b1220] transition hover:bg-[#dfe6f8] active:scale-95">
                    Showing {dayLabel}
                    <X size={13} />
                  </button>
                )}
              </div>
              <span aria-live="polite" className="shrink-0 rounded-full border border-[#0b1220]/10 bg-white px-3.5 py-2 text-sm font-bold text-[#1f46c9]">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map(i => <CardSkeleton key={i} />)}
              </div>
            ) : filteredEvents.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredEvents.map((event, index) => (
                  <EventCard key={event.id || `${event.title || event.name}-${index}`} event={event} index={index} onOpen={openDetails} />
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="rounded-[1.5rem] border border-dashed border-[#1f46c9]/30 bg-white px-5 py-16 text-center text-[#0b1220] sm:py-20">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e9eefb] text-[#1f46c9]">
                    <CalendarDays size={29} />
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-tight">{query || dayFilter || timeFilter !== 'Any time' ? 'Nothing matches your filters' : 'A little quiet around here'}</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#0b1220]/55">
                    {loadFailed
                      ? 'We could not refresh the live listings. You can still explore saved events or add a community event.'
                      : 'No events are listed here right now. Know something happening in town? Add it to the community calendar.'}
                  </p>
                  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {(query || dayFilter || timeFilter !== 'Any time' || category !== 'All events') && (
                      <button onClick={() => { setQuery(''); setDayFilter(''); setTimeFilter('Any time'); setCategory('All events'); }} className="rounded-full border border-[#0b1220]/15 px-5 py-3 text-sm font-semibold transition hover:bg-[#f0f2f6] active:scale-95">
                        Clear filters
                      </button>
                    )}
                    <button onClick={openAdd} className={`${btnPrimary} px-6 py-3.5 text-sm`}>
                      <Plus size={16} />
                      Add a community event
                    </button>
                  </div>
                </div>
              </Reveal>
            )}
          </section>
        </div>
      </main>

      {toast && <Toast key={toast} message={toast} />}

      {/* Add event modal: fixed header, scrolling body, fixed footer */}
      {addOpen && (
        <AddEventModal
          closing={addClosing}
          onClose={closeAdd}
          onBackdrop={() => !addClosing && closeAdd()}
          form={form}
          onFieldChange={onFieldChange}
          onSubmit={addEvent}
          formError={formError}
          mobile={mobile}
          setMobile={(value) => {
            setMobile(value.replace(/\D/g, '').slice(0, 10));
            setOtpState('idle');
            setOtpMessage('');
            setOtpSeconds(0);
          }}
          otp={otp}
          setOtp={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
          otpState={otpState}
          otpMessage={otpMessage}
          otpSeconds={otpSeconds}
          sendDemoOtp={sendDemoOtp}
          verifyDemoOtp={verifyDemoOtp}
          faceState={faceState}
          faceStep={faceStep}
          faceMessage={faceMessage}
          capturedSnapshots={capturedSnapshots}
          videoRef={videoRef}
          startFaceCheck={startFaceCheck}
          stopCamera={stopCamera}
          setFaceState={setFaceState}
          imageBusy={imageBusy}
          chooseImage={chooseImage}
          onRemoveImage={() => setForm((current) => ({ ...current, image: '' }))}
        />
      )}

      {/* Event details modal */}
      {selectedEvent && (
        <Modal closing={detailClosing} onBackdrop={() => !detailClosing && closeDetails()} labelledBy="details-title">
          <button onClick={closeDetails} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full bg-white/95 p-2.5 text-[#0b1220] shadow-sm transition duration-200 hover:bg-white active:scale-90">
            <X size={19} />
          </button>

          <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${thinScroll}`}>
            {eventImageUrl(selectedEvent) ? (
              <div className="relative h-56 bg-[#e9eefb] sm:h-72">
                <EventImage src={eventImageUrl(selectedEvent)} category={selectedEvent.category} alt={selectedEvent.title || selectedEvent.name || 'Event'} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1220]/60 via-transparent to-[#0b1220]/15" />
                <span className="absolute bottom-4 left-5 rounded-full bg-[#f2b53d] px-3 py-1.5 text-xs font-bold text-[#0b1220]">{selectedEvent.category || 'Community'}</span>
              </div>
            ) : <div className="relative h-56 bg-[#e9eefb] sm:h-72"><EventImage category={selectedEvent.category} alt={selectedEvent.title || selectedEvent.name || 'Event'} /><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1220]/40 via-transparent to-transparent" /><span className="absolute bottom-4 left-5 rounded-full bg-[#f2b53d] px-3 py-1.5 text-xs font-bold text-[#0b1220]">{selectedEvent.category || 'Community'}</span></div>}

            <div className="p-5 sm:p-8">
              <p className="mb-3 text-sm font-bold text-[#1f46c9]">Discover something local</p>
              <h2 id="details-title" className="text-3xl font-black leading-tight tracking-[-0.055em] sm:text-4xl">{selectedEvent.title || selectedEvent.name}</h2>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e9eefb] px-3.5 py-2 text-sm font-semibold text-[#14308f]">
                  <CalendarDays size={15} />
                  {formatDate(selectedEvent.date || selectedEvent.startDate)}
                </span>
                {(selectedEvent.time || selectedEvent.startTime) && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium">
                    <Clock3 size={15} />
                    {selectedEvent.time || selectedEvent.startTime}
                  </span>
                )}
                {selectedEvent.mode && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium">
                    <MapPin size={15} />
                    {selectedEvent.mode}
                  </span>
                )}
                {!selectedEvent.scraped && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium">
                    <Users size={15} />
                    {registrationCount(selectedEvent)} registered <span className="text-xs text-[#0b1220]/45">demo</span>
                  </span>
                )}
              </div>

              <div className="mt-7 space-y-3">
                {(selectedEvent.venue || selectedEvent.location) && (
                  <div className="flex items-start gap-3 rounded-xl border border-[#0b1220]/10 bg-white p-4">
                    <MapPin size={19} className="mt-0.5 shrink-0 text-[#1f46c9]" />
                    <div>
                      <p className="text-sm font-bold">Where</p>
                      <p className="mt-1 text-sm leading-6 text-[#0b1220]/65">{selectedEvent.venue || selectedEvent.location}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.organizer && (
                  <div className="flex items-start gap-3 rounded-xl border border-[#0b1220]/10 bg-white p-4">
                    <Users size={19} className="mt-0.5 shrink-0 text-[#1f46c9]" />
                    <div>
                      <p className="text-sm font-bold">Organiser</p>
                      <p className="mt-1 text-sm text-[#0b1220]/65">{selectedEvent.organizer}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.price && (
                  <div className="flex items-start gap-3 rounded-xl border border-[#0b1220]/10 bg-white p-4">
                    <Ticket size={19} className="mt-0.5 shrink-0 text-[#1f46c9]" />
                    <div>
                      <p className="text-sm font-bold">Ticket price</p>
                      <p className="mt-1 text-sm text-[#0b1220]/65">{selectedEvent.price}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedEvent.registration && (
                <div className="mt-6">
                  <Panel icon={Ticket} title="How to participate">
                    <p className="mt-2 text-sm leading-6 text-[#0b1220]/65">{selectedEvent.registration.method}</p>
                    {selectedEvent.registration.phone && (
                      <a href={selectedEvent.registration.phoneHref || `tel:${selectedEvent.registration.phone}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#e9eefb] px-4 py-2.5 text-sm font-bold text-[#14308f] transition hover:bg-[#cfdaf5]">
                        <Phone size={15} />
                        {selectedEvent.registration.contactName}: {selectedEvent.registration.phone}
                      </a>
                    )}
                  </Panel>
                </div>
              )}

              <div className="mt-7">
                <h3 className="text-lg font-black tracking-tight">About this event</h3>
                {selectedEvent.description ? (
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#0b1220]/65">{selectedEvent.description}</p>
                ) : detailsLoading ? (
                  <div className="mt-3 space-y-2" aria-busy="true">
                    <div className={`h-3.5 w-full rounded-full ${skeleton}`} />
                    <div className={`h-3.5 w-11/12 rounded-full ${skeleton}`} />
                    <div className={`h-3.5 w-2/3 rounded-full ${skeleton}`} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[#0b1220]/50">More information is not available in the public listing yet.</p>
                )}
              </div>

              {selectedEvent.scraped && selectedEvent.url && (
                <a
                  href={selectedEvent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#1f46c9] underline decoration-[#1f46c9]/30 underline-offset-4 hover:decoration-[#1f46c9]"
                >
                  View original listing
                  <ArrowUpRight size={15} />
                </a>
              )}

              <button onClick={closeDetails} className={`${btnPrimary} mt-8 w-full px-6 py-4 text-sm`}>Done</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
