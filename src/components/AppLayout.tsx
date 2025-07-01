import React, { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AnimatedBanner = () => {
  return (
    <div className="bg-white text-black py-2 overflow-hidden relative">
      <div className="animate-scroll whitespace-nowrap">
        <span className="inline-block px-8 text-sm tracking-wide font-normal">
          The Future Belongs to AI-powered Traders – No Hedge Funds Allowed.
        </span>
        <span className="inline-block px-8 text-sm tracking-wide font-normal">
          The Future Belongs to AI-powered Traders – No Hedge Funds Allowed.
        </span>
        <span className="inline-block px-8 text-sm tracking-wide font-normal">
          The Future Belongs to AI-powered Traders – No Hedge Funds Allowed.
        </span>
        <span className="inline-block px-8 text-sm tracking-wide font-normal">
          The Future Belongs to AI-powered Traders – No Hedge Funds Allowed.
        </span>
      </div>
    </div>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, setUser } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isLoggedIn = !!user.email;

  useEffect(() => {
    setIsMenuOpen(false);
  }, []);

  const handleLogout = () => {
    setUser({ ...user, email: '' });
  };

  return (
    <div className="min-h-screen text-white">
      <AnimatedBanner />
      <nav className="w-full bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-24">
          <div className="flex-shrink-0">
            <span className="flex items-center space-x-2 select-none">
              <img src="/images/Goated Final Logo.png" alt="Goated AI Logo" className="h-16 w-auto" />
            </span>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-center items-center">
            <div className="flex items-baseline space-x-10">
              <span className="text-white text-lg transition-colors cursor-not-allowed select-none">About</span>
              <span className="text-white text-lg transition-colors cursor-not-allowed select-none">Features</span>
              <span className="text-white text-lg transition-colors cursor-not-allowed select-none">Pricing</span>
              <span className="text-white text-lg transition-colors cursor-not-allowed select-none">Careers</span>
              <span className="text-white text-lg transition-colors cursor-not-allowed select-none">FAQ</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            {!isLoggedIn ? (
              <>
                <Button variant="default" className="cursor-not-allowed select-none" disabled>Log In</Button>
                <Button className="cursor-not-allowed select-none" disabled>Sign Up</Button>
              </>
            ) : (
              <Button onClick={handleLogout}>Log out</Button>
            )}
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed. */}
              <svg className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Icon when menu is open. */}
              <svg className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <span className="text-gray-300 block px-3 py-2 rounded-md text-base font-medium cursor-not-allowed select-none">About</span>
            <span className="text-gray-300 block px-3 py-2 rounded-md text-base font-medium cursor-not-allowed select-none">Features</span>
            <span className="text-gray-300 block px-3 py-2 rounded-md text-base font-medium cursor-not-allowed select-none">Pricing</span>
            <span className="text-gray-300 block px-3 py-2 rounded-md text-base font-medium cursor-not-allowed select-none">Careers</span>
            <span className="text-gray-300 block px-3 py-2 rounded-md text-base font-medium cursor-not-allowed select-none">FAQ</span>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="px-2 space-y-2">
              {!isLoggedIn ? (
                <>
                  <Button variant="default" className="w-full justify-start cursor-not-allowed select-none" disabled>Log In</Button>
                  <Button className="w-full justify-start cursor-not-allowed select-none" disabled>Sign Up</Button>
                </>
              ) : (
                <Button className="w-full justify-start" onClick={handleLogout}>Log out</Button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="bg-black">{children}</main>
    </div>
  );
};

export default AppLayout;
