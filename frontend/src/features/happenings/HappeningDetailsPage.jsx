import { useMemo } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock3, MapPin, Phone, Ticket, Users } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import API_BASE_URL from '../../config/api';

const DETAILS_CACHE_KEY = 'happening.event-details.v1.';

function readCachedEvent(eventId) {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(`${DETAILS_CACHE_KEY}${eventId}`) || 'null');
    return saved && typeof saved === 'object' ? saved : null;
  } catch { return null; }
}

function formatDate(value) {
  if (!value) return 'Date to be announced';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatTime(value) {
  const time = String(value || '').trim();
  if (!time) return '';
  const twelveHour = time.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (twelveHour) return `${Number(twelveHour[1])}:${twelveHour[2]} ${/p/i.test(twelveHour[3]) ? 'PM' : 'AM'}`;
  const twentyFourHour = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHour) return time;
  const hour = Number(twentyFourHour[1]);
  return hour > 23 ? time : `${hour % 12 || 12}:${twentyFourHour[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function imageUrl(event) {
  const candidate = event?.image ?? event?.imageUrl ?? event?.image_url ?? event?.thumbnail ?? event?.thumbnailUrl ?? event?.thumbnail_url;
  if (typeof candidate !== 'string' || !candidate.trim()) return '';
  const source = candidate.trim();
  return source.startsWith('/api/') ? `${API_BASE_URL}${source}` : source;
}

function EventHero({ event }) {
  const source = imageUrl(event);
  const category = event.category || 'Community';
  return (
    <div className="relative h-52 overflow-hidden bg-[#e9eefb] sm:h-72 lg:h-80">
      {source ? (
        <img src={source} alt="" className="h-full w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="grid h-full place-items-center bg-[radial-gradient(circle_at_25%_20%,#ffffff_0,transparent_30%),linear-gradient(135deg,#e9eefb,#d7e0f5)]">
          <CalendarDays size={56} strokeWidth={1.4} className="text-[#1f46c9]/60" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1220]/60 via-transparent to-[#0b1220]/10" />
      <span className="absolute bottom-4 left-4 rounded-full bg-[#f2b53d] px-3.5 py-2 text-xs font-bold text-[#0b1220] shadow-sm sm:left-6">{category}</span>
      {event.scraped && <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-[#0b1220] shadow-sm">{event.sourceName || 'Found online'}</span>}
    </div>
  );
}

function DetailRow({ icon: Icon, title, children, href }) {
  const content = <><Icon size={19} className="mt-0.5 shrink-0 text-[#1f46c9]" /><div><p className="text-sm font-bold text-[#0b1220]">{title}</p><p className="mt-1 text-sm leading-6 text-[#0b1220]/65">{children}</p></div></>;
  const className = 'flex items-start gap-3 rounded-xl border border-[#0b1220]/10 bg-white p-4 transition hover:border-[#1f46c9]/35';
  return href ? <a href={href} className={className}>{content}</a> : <div className={className}>{content}</div>;
}

export default function HappeningDetailsPage() {
  const { eventId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const event = useMemo(() => location.state?.event || readCachedEvent(eventId), [eventId, location.state]);

  if (!event) {
    return (
      <section className="bg-[#f5f6f8] px-4 py-12 text-[#0b1220] sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl rounded-[1.75rem] border border-[#0b1220]/10 bg-white p-6 text-center shadow-sm sm:p-10">
          <CalendarDays className="mx-auto text-[#1f46c9]" size={36} />
          <h1 className="mt-4 text-2xl font-black tracking-tight">Event details are unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#0b1220]/65">Please return to Happenings and choose Explore again.</p>
          <Link to="/services/happenings" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1f46c9] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#14308f]"><ArrowLeft size={16} /> Back to happenings</Link>
        </div>
      </section>
    );
  }

  const title = event.title || event.name || 'Event details';
  const venue = event.venue || event.location;
  const originalLink = event.url || event.registrationUrl;

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-5 text-[#0b1220] sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-[#14308f] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] sm:mb-6"><ArrowLeft size={17} /> Back to happenings</button>
        <article className="overflow-hidden rounded-[1.5rem] border border-[#0b1220]/10 bg-[#fafbfc] shadow-[0_18px_45px_-26px_rgba(11,18,32,.35)] sm:rounded-[2rem]">
          <EventHero event={event} />
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="text-sm font-bold text-[#1f46c9]">Discover something local</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight tracking-[-0.055em] sm:text-4xl lg:text-5xl">{title}</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e9eefb] px-3.5 py-2 text-sm font-semibold text-[#14308f]"><CalendarDays size={15} />{formatDate(event.date || event.startDate)}</span>
              {(event.time || event.startTime) && <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium"><Clock3 size={15} />{formatTime(event.time || event.startTime)}</span>}
              {event.mode && <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium"><MapPin size={15} />{event.mode}</span>}
              {event.scraped && event.price && <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium"><Ticket size={15} />{event.price}</span>}
            </div>
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {venue && <DetailRow icon={MapPin} title="Where">{venue}</DetailRow>}
              {event.organizer && <DetailRow icon={Users} title="Organiser">{event.organizer}</DetailRow>}
              {event.contactPhone && <DetailRow icon={Phone} title="Contact phone" href={`tel:${event.contactPhone}`}>{event.contactPhone}</DetailRow>}
              {event.price && !event.scraped && <DetailRow icon={Ticket} title="Ticket price">{event.price}</DetailRow>}
            </div>
            <section className="mt-8 border-t border-[#0b1220]/10 pt-7">
              <h2 className="text-xl font-black tracking-tight">About this event</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#0b1220]/65 sm:text-base">{event.description || 'More information is not available in the public listing yet.'}</p>
            </section>
            {originalLink && <div className="mt-8 rounded-2xl border border-[#0b1220]/10 bg-white p-4 sm:p-5"><a href={originalLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1f46c9] px-5 text-sm font-bold text-white transition hover:bg-[#14308f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f46c9] focus-visible:ring-offset-2">{event.scraped ? 'Open original event page' : 'Open registration link'} <ArrowUpRight size={17} /></a><p className="mt-2 text-center text-xs leading-5 text-[#0b1220]/55">The organiser’s page opens in a new tab.</p></div>}
          </div>
        </article>
      </div>
    </main>
  );
}
