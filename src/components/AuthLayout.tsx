import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen text-white bg-black">
      <main>{children}</main>
    </div>
  );
};

export default AuthLayout; 