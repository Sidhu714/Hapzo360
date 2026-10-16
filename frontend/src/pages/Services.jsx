import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import ServiceGrid from '../components/ServiceGrid';
export default function Services() {
  const { t } = useLanguage();
  return <div className="page-shell py-8 md:py-11">
    <section className="page-hero mb-10 px-6 py-10 md:px-12 md:py-12"><span className="page-kicker"><Sparkles size={14}/> Find what you need</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-.05em] md:text-5xl">{t('nav.services')}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#c5d0c7]">From your next job to practical local updates, explore the parts of Hapzo that make everyday decisions a little easier.</p><Link to="/services/openings" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#d4e99b] hover:text-white">Explore job openings <ArrowRight size={16}/></Link></section>
    <div className="mb-6"><p className="eyebrow">Explore by interest</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#20372a]">One place. Useful possibilities.</h2></div><ServiceGrid />
  </div>;
}
