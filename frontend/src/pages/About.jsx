import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Cpu,
  Heart,
  IndianRupee,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const values = [
  {
    icon: MapPin,
    title: "about.valueOpportunity",
    description: "about.valueOpportunityText",
  },
  {
    icon: Users,
    title: "about.valuePeople",
    description: "about.valuePeopleText",
  },
  {
    icon: Heart,
    title: "about.valueRealLife",
    description: "about.valueRealLifeText",
  },
];

// The five Hapzo360 services orbiting the "360" hub (spaced evenly on one ring).
// If a `services.<id>.title` translation is missing, the English title is used.
const SERVICES = [
  { id: "happenings", title: "Happenings", icon: CalendarDays, color: "#ff6b81" },
  { id: "openings", title: "Openings", icon: Briefcase, color: "#ffb04d" },
  { id: "trends", title: "Trends", icon: TrendingUp, color: "#2fbf8f" },
  { id: "price-list", title: "Price List", icon: IndianRupee, color: "#e0408f" },
  { id: "technologies", title: "Technologies", icon: Cpu, color: "#7a63f5" },
];

const serviceTitle = (t, id, fallback) => {
  const value = t(`services.${id}.title`);
  return typeof value === "string" && value && value !== `services.${id}.title` ? value : fallback;
};

const ORBIT_STYLES = `
.ab-orbit{position:relative;width:100%;aspect-ratio:1}
.ab-sweep{position:absolute;inset:3%;border-radius:50%;background:conic-gradient(from 0deg,rgba(169,210,170,0) 0deg,rgba(169,210,170,.26) 70deg,rgba(169,210,170,0) 71deg);-webkit-mask-image:radial-gradient(circle,transparent 20%,#000 21%);mask-image:radial-gradient(circle,transparent 20%,#000 21%);animation:ab-spin 9s linear infinite}
.ab-ring{position:absolute;border-radius:50%;border:1px dashed rgba(255,255,255,.26);animation:ab-spin var(--d) linear infinite var(--dir)}
.ab-sat-wrap{position:absolute;inset:0;transform:rotate(var(--a))}
.ab-sat{position:absolute;left:50%;top:0;transform:translate(-50%,-50%) rotate(calc(-1 * var(--a)))}
.ab-sat-inner{animation:ab-spin var(--d) linear infinite var(--inv)}
.ab-dotnode{position:absolute;left:50%;top:0;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:var(--c);box-shadow:0 0 12px var(--c)}
@keyframes ab-spin{to{transform:rotate(360deg)}}
.ab-node{display:flex;align-items:center;gap:8px;padding:5px 13px 5px 5px;border-radius:999px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.26);backdrop-filter:blur(10px);box-shadow:0 10px 24px -12px var(--c);font-size:12px;font-weight:700;color:#fff;white-space:nowrap}
.ab-node i{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--c);color:#fff;box-shadow:0 0 14px var(--c)}
.ab-hub{position:absolute;inset:39%;display:grid;place-content:center;justify-items:center;border-radius:50%;background:radial-gradient(circle at 30% 25%,#a9d2aa,#4f8a5f 55%,#1d4a42);box-shadow:0 0 50px rgba(139,189,145,.55),inset 0 2px 0 rgba(255,255,255,.35)}
.ab-hub::before,.ab-hub::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid rgba(169,210,170,.65);animation:ab-pulse 3s ease-out infinite}
.ab-hub::after{animation-delay:1.5s}
.ab-hub span{font-size:clamp(22px,4.4vw,34px);font-weight:800;line-height:1;letter-spacing:-.04em;color:#fff}
.ab-hub small{margin-top:3px;font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.8)}
@keyframes ab-pulse{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}
@media (prefers-reduced-motion:reduce){
  .ab-sweep,.ab-ring,.ab-sat-inner,.ab-hub::before,.ab-hub::after{animation:none!important}
}
`;

/** The five services orbiting a glowing "360" hub. */
function ServiceOrbit({ t }) {
  const step = 360 / SERVICES.length;

  return (
    <div
      className="ab-orbit"
      role="img"
      aria-label="Happenings, Openings, Trends, Price List and Technologies orbiting Hapzo360"
    >
      <style>{ORBIT_STYLES}</style>
      <div className="ab-sweep" />

      {/* faint outer ring with two small lights */}
      <div className="ab-ring" style={{ inset: "1%", "--d": "80s", "--dir": "normal" }}>
        {[40, 220].map((angle) => (
          <div key={angle} className="ab-sat-wrap" style={{ "--a": `${angle}deg` }}>
            <span className="ab-dotnode" style={{ "--c": "#a9d2aa" }} />
          </div>
        ))}
      </div>

      {/* the five services */}
      <div
        className="ab-ring"
        style={{ inset: "14%", "--d": "56s", "--dir": "normal", "--inv": "reverse" }}
      >
        {SERVICES.map((service, index) => {
          const Icon = service.icon;
          return (
            <div key={service.id} className="ab-sat-wrap" style={{ "--a": `${index * step}deg` }}>
              <div className="ab-sat">
                <div className="ab-sat-inner">
                  <span className="ab-node" style={{ "--c": service.color }}>
                    <i>
                      <Icon size={15} />
                    </i>
                    {serviceTitle(t, service.id, service.title)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* inner ring with three small lights */}
      <div className="ab-ring" style={{ inset: "28%", "--d": "30s", "--dir": "reverse" }}>
        {[0, 120, 240].map((angle, index) => (
          <div key={angle} className="ab-sat-wrap" style={{ "--a": `${angle}deg` }}>
            <span className="ab-dotnode" style={{ "--c": SERVICES[index].color }} />
          </div>
        ))}
      </div>

      <div className="ab-hub">
        <span>360</span>
        <small>Hapzo</small>
      </div>
    </div>
  );
}

export default function Aboutpage() {
  const { t } = useLanguage();

  return (
    <main className="overflow-hidden bg-[#f8faf7] text-[#173536]">
      {/* Hero */}
      <section className="relative px-5 pb-20 pt-20 sm:px-10 md:pb-28 md:pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce8dd] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#507b5c]">
              <span className="h-2 w-2 rounded-full bg-[#8bbd91]" />
              {t("about.eyebrow")}
            </p>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("about.heroTitle")}{" "}
              <span className="text-[#70a879]">
                {t("about.heroHighlight")}
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#687c74] sm:text-lg">
              {t("about.description")}
            </p>

            <Link
              to="/"
              className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#173536] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#28534a]"
            >
              {t("about.explore")}
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Orbit animation */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#dcebd7]" />
            <div className="absolute -bottom-5 -left-5 h-28 w-28 rounded-full bg-[#f0e5d3]" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-[#173536] p-4 shadow-xl shadow-[#173536]/10 sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(112,168,121,.28),transparent_65%)]"
              />
              <div className="relative">
                <ServiceOrbit t={t} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-[#e6ece4] bg-white px-5 py-20 sm:px-10 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#70a879]">
              {t("about.eyebrow")}
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {t("about.title")}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  key={value.title}
                  className="group rounded-3xl border border-[#e8eee6] bg-[#fbfcfa] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#cbdcc9] hover:shadow-lg hover:shadow-[#173536]/5 sm:p-8"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#568761] transition group-hover:bg-[#173536] group-hover:text-white">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-7 text-xl font-semibold">
                    {t(value.title)}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-[#718178]">
                    {t(value.description)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing section */}
      <section className="px-5 py-20 sm:px-10 md:py-28">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#173536] px-6 py-12 text-center text-white sm:px-12 sm:py-16 md:px-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a9d2aa]">
            {t("about.ideaEyebrow")}
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {t("about.ideaTitle")}
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#c3d3cc] sm:text-base">
            {t("about.ideaDescription")}
          </p>

          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#cce5c5] px-7 py-4 text-sm font-semibold text-[#173536] transition hover:bg-white"
          >
            {t("about.explore")}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}