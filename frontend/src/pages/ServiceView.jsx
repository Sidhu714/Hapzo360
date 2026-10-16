import { Suspense } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { SERVICES } from '../features/registry';
import Loader from '../components/Loader';
export default function ServiceView() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const svc = SERVICES.find((s) => s.slug === slug);
  if (!svc) return <Navigate to="/services" replace />;
  if (!svc.component) {
    const Icon = svc.icon;
    return <div className="page-shell py-8 md:py-11"><section className="page-hero px-6 py-12 text-center md:px-12 md:py-16"><Link to="/services" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#c5d0c7] hover:text-white"><ArrowLeft size={15}/> All services</Link><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#dce9b8] text-[#315844]"><Icon className="h-8 w-8"/></span><h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-4xl">{t(`svc.${slug}`)}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#c5d0c7]">{t(`svc.${slug}.desc`)}</p><span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-xs font-semibold text-[#d4e99b]">Coming soon <ArrowRight size={14}/></span></section></div>;
  }
  const Page = svc.component;
  return <Suspense fallback={<Loader />}><Page /></Suspense>;
}
