
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
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-[#e5ebe3] bg-white shadow-xl shadow-[#173536]/5 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Sidebar */}
          <aside className="relative overflow-hidden bg-[#173536] p-7 text-white sm:p-10 lg:p-12">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#37644e]/50 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#70a879]/20 blur-2xl" />

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

              <div className="mt-10 space-y-6 border-t border-white/15 pt-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#cce5c5]">
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

                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#cce5c5]">
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

                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#cce5c5]">
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
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f2e5] text-[#568761]">
                  <CheckCircle2 size={32} />
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  {t("contact.thanks")}
                </h2>

                <p className="mt-3 max-w-sm text-sm leading-7 text-[#718178]">
                  {t("contact.demoResponse")}
                </p>

                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#173536] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#28534a]"
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
                    className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#173536] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#28534a] sm:w-auto"
                  >
                    {t("contact.submit")}
                    <ArrowRight size={18} />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
