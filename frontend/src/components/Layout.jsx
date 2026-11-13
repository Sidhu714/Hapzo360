import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import HomeWaveBackdrop from './HomeWaveBackdrop';
import { PeopleAuthProvider } from '../context/PeopleAuthContext';
import { CompanyAuthProvider } from '../context/CompanyAuthContext';

export default function Layout() {
  const isHomePage = useLocation().pathname === '/';
  return (
    <PeopleAuthProvider>
    <CompanyAuthProvider>
      <div className={`flex min-h-screen flex-col${isHomePage ? ' home-layout' : ''}`}>
        {isHomePage && <HomeWaveBackdrop />}
        <Navbar />
        <main className="relative z-10 flex-1"><Outlet /></main>
        <Footer />
      </div>
    </CompanyAuthProvider>
    </PeopleAuthProvider>
  );
}
