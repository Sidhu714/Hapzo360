
import { ArrowRight, MapPin, Users, Heart } from "lucide-react";
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

          {/* Decorative illustration */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#dcebd7]" />
            <div className="absolute -bottom-5 -left-5 h-28 w-28 rounded-full bg-[#f0e5d3]" />

            <div className="relative rounded-[2rem] border border-white bg-[#e8f0e5] p-5 shadow-xl shadow-[#173536]/5 sm:p-8">
              <div className="rounded-[1.5rem] bg-white p-6 sm:p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2e5] text-[#568761]">
                  <MapPin size={28} />
                </div>

                <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#83a58a]">
                  Hapzo360
                </p>

                <h2 className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
                  {t("about.valueOpportunity")}
                </h2>

                <p className="mt-4 text-sm leading-7 text-[#718178]">
                  {t("about.valueOpportunityText")}
                </p>

                <div className="mt-8 flex items-center gap-3 border-t border-[#edf1eb] pt-5">
                  <div className="flex -space-x-2">
                    <span className="h-9 w-9 rounded-full border-2 border-white bg-[#d8e8d3]" />
                    <span className="h-9 w-9 rounded-full border-2 border-white bg-[#f0dfca]" />
                    <span className="h-9 w-9 rounded-full border-2 border-white bg-[#b9d3bf]" />
                  </div>
                  <p className="text-xs text-[#718178]">
                    {t("about.valuePeople")}
                  </p>
                </div>
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
