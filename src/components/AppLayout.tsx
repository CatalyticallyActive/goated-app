import React from "react";
interface AppLayoutProps {
  children: React.ReactNode;
}
const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-black text-white">
      <main>{children}</main>
    </div>
  );
};
export default AppLayout;
