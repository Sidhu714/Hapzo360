import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Search,
} from "lucide-react";

const slides = [
  {
    eyebrow: "YOUR NEXT CHAPTER STARTS HERE",
    title: "Find work that",
    highlight: "feels right.",
    description:
      "Discover opportunities near you, connect with local teams, and find a job that fits your life.",
    image: "https://images.unsplash.com/photo-1660980041852-230420b8f99f?auto=format&fit=crop&w=2200&q=85",
    cta: "Explore jobs",
    href: "/services/openings",
    number: "01",
  },
  {
    eyebrow: "GOOD PEOPLE. GREAT WORK.",
    title: "Meet your next",
    highlight: "work family.",
    description:
      "Find welcoming workplaces, growing teams, and opportunities to build something meaningful.",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2200&q=85",
    cta: "Discover opportunities",
    href: "/services/openings",
    number: "02",
  },
  {
    eyebrow: "LOCAL TALENT. REAL OPPORTUNITY.",
    title: "Your future is",
    highlight: "closer than you think.",
    description:
      "Take the next step in your career with opportunities designed around your everyday life.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2200&q=85",
    cta: "Find your fit",
    href: "/services/openings",
    number: "03",
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const current = slides[active];

  const next = () => {
    setActive((prev) => (prev + 1) % slides.length);
  };

  const previous = () => {
    setActive((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#172b20] text-white"
      aria-label="Featured job opportunities"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
    >
      {/* Full-width background image */}
      {slides.map((slide, index) => (
        <div
          key={slide.number}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <img
            src={slide.image}
            alt=""
            className="h-full w-full object-cover"
            fetchPriority={index === 0 ? "high" : "auto"}
          />
        </div>
      ))}

      {/* Image overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#102419]/95 via-[#152b20]/75 to-[#152b20]/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#102419]/65 via-transparent to-black/10" />

      {/* Hero content */}
      <div className="relative flex min-h-[570px] w-full items-center px-5 py-20 sm:px-10 md:min-h-[650px] md:px-16 lg:min-h-[720px] lg:px-24">
        <div
          key={current.number}
          className="w-full max-w-5xl animate-[heroEnter_.7s_ease-out]"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#d4e99b]" />
            <span className="text-[10px] font-bold tracking-[0.2em] sm:text-xs">
              {current.eyebrow}
            </span>
          </div>

          <h1 className="max-w-5xl text-5xl font-extrabold leading-[1.04] tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-8xl">
            {current.title}
            <br />
            <span className="font-medium italic text-[#d4e99b]">
              {current.highlight}
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-7 text-white/80 sm:text-base md:text-lg">
            {current.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to={current.href}
              className="group inline-flex items-center gap-3 rounded-full bg-[#d4e99b] px-6 py-4 text-sm font-bold text-[#20382a] transition hover:bg-white"
            >
              {current.cta}
              <ArrowUpRight
                size={18}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>

            <Link
              to="/post-job"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              I'm hiring
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Slide controls */}
        <div className="absolute bottom-8 left-5 right-5 flex items-center justify-between sm:bottom-10 sm:left-10 sm:right-10 md:left-16 md:right-16 lg:left-24 lg:right-24">
          <div className="flex items-center gap-3">
            {slides.map((slide, index) => (
              <button
                key={slide.number}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === active
                    ? "w-12 bg-[#d4e99b]"
                    : "w-5 bg-white/45 hover:bg-white/80"
                }`}
              />
            ))}

            {/* <span className="ml-3 font-mono text-xs text-white/75">
              {current.number} / 0{slides.length}
            </span> */}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={previous}
              aria-label="Previous slide"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/5 transition hover:bg-white hover:text-[#20382a]"
            >
              <ArrowLeft size={18} />
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/5 transition hover:bg-white hover:text-[#20382a]"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroEnter {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-\\[heroEnter_\\.7s_ease-out\\] {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}