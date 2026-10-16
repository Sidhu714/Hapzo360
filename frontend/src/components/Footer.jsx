import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from './Navbar';

export default function Footer() {
  return <footer className="hapzo-footer mt-16"><div className="page-shell grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-12"><div><Logo/><p className="footer-muted mt-4 max-w-sm text-sm leading-6">A friendlier place to discover local opportunities and make your next move.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"><Link to="/about">About Hapzo</Link><Link to="/contact">Contact <ArrowUpRight className="inline h-3.5 w-3.5"/></Link><Link to="/post-job">For employers</Link></div><div className="footer-muted border-t border-white/10 pt-5 text-xs md:col-span-2">© {new Date().getFullYear()} Hapzo360. Built for people and places.</div></div></footer>;
}
