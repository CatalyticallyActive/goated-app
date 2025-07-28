import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { debug } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const isLoggedIn = !!user;

  useEffect(() => {
    setIsSidebarOpen(true);
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          debug.error('Error checking admin status:', error);
          return;
        }

        setIsAdmin(data?.role === 'admin');
      } catch (error) {
        debug.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  const navigationItems = [
    { name: 'Analysis', href: '/analysis' },
    { name: 'Personalize', href: '/personalize' },
    { name: 'Profile & Settings', href: '/settings' },
  ];

  // Add Prompt Testing for admin users
  if (isAdmin) {
    navigationItems.push({ name: 'Prompt Testing', href: '/prompt-testing' });
  }

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen text-white bg-black">
      {/* Sidebar (fixed, full height) - only show when logged in */}
      {isLoggedIn && (
        <div className="fixed top-0 left-0 z-50 h-screen w-56 glass-effect border border-white/20 bg-black/60 flex flex-col">
          {/* Logo */}
          <div className="flex items-center px-4 pt-2">
            <span className="flex items-center space-x-2 select-none">
              <img src="/images/Goated Final Logo.png" alt="Goated AI Logo" className="h-8 w-auto" />
            </span>
          </div>
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                data-state={isActive(item.href) ? 'active' : 'inactive'}
                className="inline-flex items-center justify-start whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10 w-full"
              >
                {item.name}
              </Link>
            ))}
          </nav>
          {/* Logout button at bottom */}
          <div className="p-4 mt-auto">
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 border-white/20 glass-effect"
            >
              Log out
            </Button>
          </div>
        </div>
      )}
      {/* Main content (with conditional left padding for sidebar) */}
      <div className={isLoggedIn ? "pl-56" : ""}>
        <main>{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
