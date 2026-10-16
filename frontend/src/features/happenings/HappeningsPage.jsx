import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Ticket,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "happening-user-events";

const CATEGORIES = [
  "All events",
  "Music",
  "Arts",
  "Food",
  "Business",
  "Community",
  "Workshops",
  "Sports",
];

function getStoredEvents() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatDate(value) {
  if (!value) return "Date to be announced";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function demoRegistrations(event) {
  if (Number.isFinite(Number(event.registeredCount))) {
    return Math.min(20, Math.max(0, Number(event.registeredCount)));
  }

  const seed = event.id || event.title || event.name || "event";

  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash % 21;
}

function EventCard({ event, onOpen }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-[24px] border border-[#e3e8dc] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#20372a]/[.06]"
    >
      {event.image && (
        <div className="h-44 overflow-hidden">
          <img
            src={event.image}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#66806c]">
          <CalendarDays size={15} />
          {formatDate(event.date || event.startDate)}
        </div>

        <h3 className="mt-2 line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-[#20372a]">
          {event.title || event.name}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
          {(event.time || event.startTime) && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {event.time || event.startTime}
            </span>
          )}

          {(event.venue || event.location) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} />
              <span className="line-clamp-1">
                {event.venue || event.location}
              </span>
            </span>
          )}
        </div>

        {(event.category || event.description) && (
          <p className="mt-3 line-clamp-2 text-xs leading-6 text-stone-500">
            {event.category || event.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1df] px-3 py-1.5 text-xs font-bold text-[#315844]">
            <Users size={15} />
            {demoRegistrations(event)} registered
            <span className="font-medium text-[#66806c]">demo</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#315844] transition group-hover:text-[#6b8b42]">
            View details
            <ArrowUpRight
              size={14}
              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </div>
    </article>
  );
}

function AddEventDialog({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    venue: "",
    category: "Community",
    description: "",
    image: "",
  });

  const [imageError, setImageError] = useState("");

  function update(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function chooseImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Choose an image file.");
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setImageError("Choose an image under 1.5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImageError("");
      setForm((current) => ({
        ...current,
        image: String(reader.result),
      }));
    };

    reader.onerror = () => {
      setImageError(
        "Could not read that image. Please try another one."
      );
    };

    reader.readAsDataURL(file);
  }

  function submit(event) {
    event.preventDefault();

    onSave({
      id: `local-${Date.now()}`,
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      venue: form.venue.trim(),
      category: form.category,
      description: form.description.trim(),
      image: form.image,
      createdByUser: true,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172b20]/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[24px] border border-[#e3e8dc] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#66806c]">
              Tiruppur community
            </p>

            <h2
              id="add-event-title"
              className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-[#20372a]"
            >
              Add a new event
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e3e8dc] text-stone-500 transition hover:bg-[#f1f4eb]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-500">
              Event name
            </span>

            <input
              name="title"
              value={form.title}
              onChange={update}
              required
              maxLength={100}
              placeholder="e.g. Weekend pottery workshop"
              className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">
                Date
              </span>

              <input
                type="date"
                name="date"
                value={form.date}
                onChange={update}
                required
                className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">
                Time <span className="font-medium">(optional)</span>
              </span>

              <input
                type="time"
                name="time"
                value={form.time}
                onChange={update}
                className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-500">
              Venue in Tiruppur
            </span>

            <input
              name="venue"
              value={form.venue}
              onChange={update}
              required
              maxLength={120}
              placeholder="e.g. Town Hall, Tiruppur"
              className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-500">
              Category
            </span>

            <select
              name="category"
              value={form.category}
              onChange={update}
              className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
            >
              {CATEGORIES.slice(1).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-500">
              Event details{" "}
              <span className="font-medium">(optional)</span>
            </span>

            <textarea
              name="description"
              value={form.description}
              onChange={update}
              rows={3}
              maxLength={1200}
              placeholder="Tell people what the event is about"
              className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-500">
              Event image{" "}
              <span className="font-medium">
                (optional, up to 1.5 MB)
              </span>
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={chooseImage}
              className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-[#20372a] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
            />
          </label>

          {imageError && (
            <p className="text-xs font-semibold text-rose-600">
              {imageError}
            </p>
          )}

          {form.image && (
            <div className="overflow-hidden rounded-2xl border border-[#e3e8dc]">
              <img
                src={form.image}
                alt="Event preview"
                className="h-40 w-full object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    image: "",
                  }))
                }
                className="w-full bg-[#f1f4eb] px-4 py-2.5 text-xs font-bold text-[#315844] transition hover:bg-[#e6edd9]"
              >
                Remove image
              </button>
            </div>
          )}

          <p className="rounded-xl bg-[#f1f4eb] px-4 py-3 text-xs leading-6 text-stone-500">
            Events are saved only in this browser using localStorage.
          </p>

          <div className="flex justify-end gap-3 border-t border-[#edf0e8] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#dce4d4] bg-white px-5 py-3 text-sm font-bold text-stone-600 transition hover:bg-[#f1f4eb]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#20372a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#315844]"
            >
              Add event
              <Plus size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EventDetailsDialog({ event, onClose, onDelete }) {
  const registration =
    event.registration ||
    (event.source === "Ticketprix"
      ? {
          method: "Ticket booking through Ticketprix",
          contactName: "Ticketprix booking support",
          phone: "044-401-15066",
          phoneHref: "tel:+914440115066",
          hours: "Daily, 9:00 AM–8:00 PM",
        }
      : null);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172b20]/60 p-4 backdrop-blur-sm"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[#e3e8dc] bg-white shadow-2xl"
      >
        <div className="relative">
          {event.image && (
            <img
              src={event.image}
              alt=""
              className="h-52 w-full object-cover"
            />
          )}

          <div className="flex items-start justify-between gap-4 p-6 pb-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#66806c]">
                Event in Tiruppur
              </p>

              <h2
                id="event-details-title"
                className="mt-1 text-2xl font-extrabold leading-snug tracking-[-.04em] text-[#20372a]"
              >
                {event.title || event.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e3e8dc] text-stone-500 transition hover:bg-[#f1f4eb]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1df] px-3 py-1.5 text-xs font-bold text-[#315844]">
              <CalendarDays size={15} />
              {formatDate(event.date || event.startDate)}
            </span>

            {(event.time || event.startTime) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1df] px-3 py-1.5 text-xs font-bold text-[#315844]">
                <Clock3 size={15} />
                {event.time || event.startTime}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f4eb] px-3 py-1.5 text-xs font-bold text-stone-600">
              <Users size={15} />
              {demoRegistrations(event)} registered
              <span className="font-medium text-stone-400">demo</span>
            </span>
          </div>

          {(event.venue || event.location) && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#e3e8dc] p-4">
              <MapPin
                size={17}
                className="mt-0.5 shrink-0 text-[#315844]"
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Venue
                </p>

                <p className="mt-1 text-sm font-semibold text-[#20372a]">
                  {event.venue || event.location}
                </p>
              </div>
            </div>
          )}

          {event.category && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#e3e8dc] p-4">
              <Sparkles
                size={17}
                className="mt-0.5 shrink-0 text-[#315844]"
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Category
                </p>

                <p className="mt-1 text-sm font-semibold text-[#20372a]">
                  {event.category}
                </p>
              </div>
            </div>
          )}

          {event.organizer && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#e3e8dc] p-4">
              <Users
                size={17}
                className="mt-0.5 shrink-0 text-[#315844]"
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Organizer
                </p>

                <p className="mt-1 text-sm font-semibold text-[#20372a]">
                  {event.organizer}
                </p>
              </div>
            </div>
          )}

          {event.price && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[#e3e8dc] p-4">
              <Ticket
                size={17}
                className="mt-0.5 shrink-0 text-[#315844]"
              />

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Ticket price
                </p>

                <p className="mt-1 text-sm font-semibold text-[#20372a]">
                  {event.price}
                </p>
              </div>
            </div>
          )}

          {registration && (
            <div className="mt-5 rounded-2xl border border-[#d4e99b] bg-[#f7faef] p-5">
              <div className="flex items-center gap-2">
                <Ticket size={17} className="text-[#315844]" />

                <p className="text-sm font-extrabold text-[#20372a]">
                  How to participate
                </p>
              </div>

              <p className="mt-2 text-xs leading-6 text-stone-600">
                {registration.method}. Call the booking support number
                for this event’s ticket availability and registration
                steps.
              </p>

              <a
                href={registration.phoneHref}
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#315844] hover:text-[#6b8b42]"
              >
                <Phone size={15} />
                {registration.contactName}:{" "}
                <span>{registration.phone}</span>
              </a>

              <p className="mt-2 text-[11px] leading-5 text-stone-500">
                {registration.hours}. This is Ticketprix support; an
                event-organizer direct number was not listed.
              </p>
            </div>
          )}

          {event.description ? (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                About this event
              </p>

              <p className="mt-2 text-sm leading-7 text-stone-600">
                {event.description}
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#f1f4eb] px-4 py-3 text-sm text-stone-500">
              More event information is not available yet.
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-[#edf0e8] pt-5">
            {event.createdByUser && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
              >
                Delete my event
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#20372a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#315844]"
            >
              Done
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Happening() {
  const [events, setEvents] = useState(() => getStoredEvents());
  const [category, setCategory] = useState("All events");
  const [query, setQuery] = useState("");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  function addEvent(event) {
    const updated = [event, ...events];

    setEvents(updated);
    saveStoredEvents(updated);
    setShowAddEvent(false);
  }

  function deleteEvent(id) {
    const updated = events.filter((event) => event.id !== id);

    setEvents(updated);
    saveStoredEvents(updated);
    setSelectedEvent(null);
  }

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const term = query.trim().toLowerCase();

    return events
      .filter((event) => {
        const eventDate = new Date(
          event.date || event.startDate
        );

        return (
          Number.isNaN(eventDate.getTime()) || eventDate >= today
        );
      })
      .filter((event) => {
        const eventCategory = String(
          event.category || ""
        ).toLowerCase();

        const matchesCategory =
          category === "All events" ||
          eventCategory.includes(category.toLowerCase());

        const searchable = [
          event.title || event.name,
          event.venue || event.location,
          event.category,
          event.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesCategory && searchable.includes(term);
      })
      .sort(
        (a, b) =>
          new Date(a.date || a.startDate) -
          new Date(b.date || b.startDate)
      );
  }, [events, category, query]);

  return (
    <main className="min-h-screen bg-[#fbfcf8] text-[#20372a]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#172b20]">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#d4e99b]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-[#d4e99b]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
            <Sparkles size={14} />
            Your town, your plans
          </span>

          <div className="mt-7 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
                What’s <em className="text-[#d4e99b]">happening?</em>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">
                Find and save upcoming events around Tiruppur, Tamil
                Nadu. Events added here are stored in this browser.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddEvent(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#d4e99b] px-6 py-3.5 text-sm font-bold text-[#20372a] transition hover:bg-white"
            >
              <Plus size={16} />
              Add new event
            </button>
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        <div className="rounded-[24px] border border-[#e3e8dc] bg-white p-4 shadow-sm sm:p-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-stone-500">
              Search events
            </span>

            <span className="flex items-center gap-2 rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 focus-within:border-[#8da76e]">
              <Search
                size={17}
                className="shrink-0 text-stone-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events or places"
                className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </span>
          </label>

          <div className="mt-4 flex gap-2 overflow-x-auto border-t border-[#edf0e8] pt-4">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                  category === item
                    ? "bg-[#20372a] text-white"
                    : "border border-[#e3e8dc] bg-white text-stone-600 hover:border-[#b7c9a5]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Event list */}
        <div className="mt-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
              {category === "All events"
                ? "Upcoming events"
                : `${category} events`}
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              {filtered.length}{" "}
              {filtered.length === 1 ? "event" : "events"} saved in
              this browser
            </p>
          </div>

          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#66806c]">
            <MapPin size={14} />
            Tiruppur, Tamil Nadu
          </span>
        </div>

        {filtered.length > 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event, index) => (
              <EventCard
                key={
                  event.id ||
                  `${event.title || event.name}-${index}`
                }
                event={event}
                onOpen={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#cbd7c1] bg-white px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf1df] text-[#315844]">
              <CalendarDays size={23} />
            </div>

            <h3 className="mt-4 text-lg font-extrabold">
              {query
                ? "No matching events"
                : "No events saved yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-stone-500">
              Add an event to save it locally in this browser. Clearing
              browser data or using another device will not show these
              events.
            </p>

            <button
              type="button"
              onClick={() => setShowAddEvent(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#20372a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#315844]"
            >
              <Plus size={16} />
              Add your first event
            </button>
          </div>
        )}
      </section>

      {showAddEvent && (
        <AddEventDialog
          onClose={() => setShowAddEvent(false)}
          onSave={addEvent}
        />
      )}

      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={deleteEvent}
        />
      )}
    </main>
  );
}