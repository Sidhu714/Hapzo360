import { useState } from "react";
import {
  ArrowRight,
  Mail,
  MapPin,
  Phone,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STYLES = `
.ct-ripple{transform-box:fill-box;transform-origin:center;animation:ct-ripple 3s ease-out infinite}
@keyframes ct-ripple{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.4);opacity:0}}
.ct-node{transform-box:fill-box;transform-origin:center;animation:ct-breathe 3.4s ease-in-out infinite}
@keyframes ct-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.ct-dash{animation:ct-dash 2.4s linear infinite}
@keyframes ct-dash{to{stroke-dashoffset:-18}}

.ct-blob{animation:ct-drift 16s ease-in-out infinite alternate}
.ct-blob--b{animation-duration:21s;animation-direction:alternate-reverse}
@keyframes ct-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(-26px,22px) scale(1.12)}}

.ct-success{position:relative;display:grid;place-items:center;width:64px;height:64px}
.ct-success::before,.ct-success::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #8bbd91;animation:ct-pulse 2.4s ease-out infinite}
.ct-success::after{animation-delay:1.2s}
.ct-success>div{animation:ct-pop .7s cubic-bezier(.2,1.4,.4,1) both}
@keyframes ct-pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.1);opacity:0}}
@keyframes ct-pop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
.ct-fly{position:absolute;left:50%;top:50%;animation:ct-fly 1.6s cubic-bezier(.4,0,.2,1) .15s both}
@keyframes ct-fly{0%{transform:translate(-150px,60px) rotate(-18deg);opacity:0}25%{opacity:1}100%{transform:translate(120px,-90px) rotate(-18deg);opacity:0}}
.ct-rise{animation:ct-rise .6s cubic-bezier(.2,.7,.2,1) both}
@keyframes ct-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

@media (prefers-reduced-motion:reduce){
  .ct-ripple,.ct-node,.ct-dash,.ct-blob,.ct-success::before,.ct-success::after,.ct-success>div,.ct-fly,.ct-rise{animation:none!important}
  .ct-fly{display:none}
}
`;

/** A message travels from "you" to Hapzo and the destination ripples when it arrives. */
function MessageFlight() {
  const animate = !prefersReducedMotion();
  const path = "M54 84 C112 18 202 124 262 48";

  return (
    <svg viewBox="0 0 320 130" className="h-auto w-full" aria-hidden="true">
      {/* route */}
      <path
        className="ct-dash"
        d={path}
        fill="none"
        stroke="rgba(204,229,197,.5)"
        strokeWidth="1.6"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />

      {/* sender */}
      <g className="ct-node">
        <circle cx="36" cy="92" r="19" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.35)" />
        <circle cx="36" cy="86" r="4.6" fill="rgba(255,255,255,.9)" />
        <path d="M27 101c1.6-6 5-8 9-8s7.4 2 9 8" fill="rgba(255,255,255,.9)" />
      </g>

      {/* destination: Hapzo, with ripples */}
      <circle className="ct-ripple" cx="284" cy="40" r="18" fill="none" stroke="#a9d2aa" strokeWidth="1.6" />
      <circle className="ct-ripple" cx="284" cy="40" r="18" fill="none" stroke="#a9d2aa" strokeWidth="1.6" style={{ animationDelay: "1.5s" }} />
      <g className="ct-node" style={{ animationDelay: "-1.2s" }}>
        <circle cx="284" cy="40" r="20" fill="#70a879" />
        <rect x="273" y="33" width="22" height="15" rx="3" fill="none" stroke="#fff" strokeWidth="1.8" />
        <path d="M274 35l10 8 10-8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* messages in flight */}
      {animate &&
        [0, 1.3, 2.6].map((begin) => (
          <g key={begin} opacity="0">
            <path d="M9 0L-7 -6L-3.5 0L-7 6Z" fill="#cce5c5" />
            <animateMotion dur="3.9s" begin={`${begin}s`} repeatCount="indefinite" rotate="auto" path={path} />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.84;1"
              dur="3.9s"
              begin={`${begin}s`}
              repeatCount="indefinite"
            />
          </g>
        ))}

      {!animate && (
        <g transform="translate(160 76) rotate(-24)">
          <path d="M9 0L-7 -6L-3.5 0L-7 6Z" fill="#cce5c5" />
        </g>
      )}
    </svg>
  );
}

export default function Contactpage() {
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Demo only: this does not send the message to a server.
    setSubmitted(true);
    setForm({
      name: "",
      email: "",
      message: "",
    });
  };

  const handleReset = () => {
    setSubmitted(false);
  };

  return (
    <main className="min-h-screen bg-[#f8faf7] px-5 py-14 text-[#173536] sm:px-10 sm:py-20">
      <style>{STYLES}</style>

      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#dce8dd] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#507b5c]">
            <span className="h-2 w-2 rounded-full bg-[#8bbd91]" />
            {t("contact.eyebrow")}
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            {t("contact.title")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#718178] sm:text-lg">
            {t("contact.description")}
          </p>
        </div>

        {/* Contact layout */}
        <div className="relative mx-auto max-w-6xl">
          <div aria-hidden="true" className="ct-blob absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#dcebd7]" />
          <div aria-hidden="true" className="ct-blob ct-blob--b absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-[#f0e5d3]" />

          <div className="relative grid overflow-hidden rounded-[2rem] border border-[#e5ebe3] bg-white shadow-xl shadow-[#173536]/5 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Sidebar */}
            <aside className="relative overflow-hidden bg-[#173536] p-7 text-white sm:p-10 lg:p-12">
              <div className="ct-blob absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#37644e]/50 blur-2xl" />
              <div className="ct-blob ct-blob--b absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#70a879]/20 blur-2xl" />

              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#cce5c5]">
                  <MessageCircle size={24} />
                </div>

                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#a9d2aa]">
                  {t("contact.getInTouch")}
                </p>

                <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                  {t("contact.conversationTitle")}
                </h2>

                <p className="mt-5 text-sm leading-7 text-[#c3d3cc]">
                  {t("contact.sidebarDescription")}
                </p>

                {/* Message on its way to Hapzo */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <MessageFlight />
                </div>

                <div className="mt-8 space-y-6 border-t border-white/15 pt-8">
                  <div className="group flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#cce5c5] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#cce5c5] group-hover:text-[#173536]">
                      <Mail size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {t("contact.writeToUs")}
                      </p>
                      <p className="mt-1 break-all text-sm text-[#c3d3cc]">
                        hello@hapzo.example
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#cce5c5] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#cce5c5] group-hover:text-[#173536]">
                      <Phone size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {t("contact.phoneLabel") === "contact.phoneLabel"
                          ? "Phone"
                          : t("contact.phoneLabel")}
                      </p>
                      <p className="mt-1 text-sm text-[#c3d3cc]">
                        +91 98765 43210
                      </p>
                    </div>
                  </div>

                  <div className="group flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#cce5c5] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-[#cce5c5] group-hover:text-[#173536]">
                      <MapPin size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {t("contact.locationLabel") === "contact.locationLabel"
                          ? "Location"
                          : t("contact.locationLabel")}
                      </p>
                      <p className="mt-1 text-sm text-[#c3d3cc]">
                        Coimbatore, Tamil Nadu
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-10 rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-6 text-[#c3d3cc]">
                  {t("contact.demoNotice")}
                </p>
              </div>
            </aside>

            {/* Form */}
            <section className="p-7 sm:p-10 lg:p-12">
              {submitted ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                  <div className="relative">
                    <svg
                      className="ct-fly"
                      width="26"
                      height="26"
                      viewBox="-10 -10 20 20"
                      aria-hidden="true"
                      style={{ marginLeft: -13, marginTop: -13 }}
                    >
                      <path d="M9 0L-7 -6L-3.5 0L-7 6Z" fill="#70a879" />
                    </svg>

                    <div className="ct-success">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f2e5] text-[#568761]">
                        <CheckCircle2 size={32} />
                      </div>
                    </div>
                  </div>

                  <h2 className="ct-rise mt-6 text-2xl font-semibold" style={{ animationDelay: "0.25s" }}>
                    {t("contact.thanks")}
                  </h2>

                  <p className="ct-rise mt-3 max-w-sm text-sm leading-7 text-[#718178]" style={{ animationDelay: "0.35s" }}>
                    {t("contact.demoResponse")}
                  </p>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="ct-rise mt-8 inline-flex items-center gap-2 rounded-full bg-[#173536] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#28534a]"
                    style={{ animationDelay: "0.45s" }}
                  >
                    {t("contact.sendAnother")}
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#70a879]">
                    {t("contact.getInTouch")}
                  </p>

                  <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                    {t("contact.formTitle")}
                  </h2>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="mb-2 block text-sm font-medium"
                      >
                        {t("contact.name")}
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder={t("contact.namePlaceholder")}
                        required
                        autoComplete="name"
                        className="w-full rounded-xl border border-[#dfe7dd] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9aa89f] focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contact-email"
                        className="mb-2 block text-sm font-medium"
                      >
                        {t("contact.email")}
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={t("contact.emailPlaceholder")}
                        required
                        autoComplete="email"
                        className="w-full rounded-xl border border-[#dfe7dd] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9aa89f] focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contact-message"
                        className="mb-2 block text-sm font-medium"
                      >
                        {t("contact.message")}
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder={t("contact.messagePlaceholder")}
                        required
                        rows={5}
                        className="w-full resize-y rounded-xl border border-[#dfe7dd] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9aa89f] focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10"
                      />
                    </div>

                    <button
                      type="submit"
                      className="group inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#173536] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#28534a] sm:w-auto"
                    >
                      {t("contact.submit")}
                      <ArrowRight
                        size={18}
                        className="transition duration-300 group-hover:translate-x-1"
                      />
                    </button>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}