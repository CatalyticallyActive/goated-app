import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Personalize from "./pages/Personalize";
import Analysis from "./pages/Analysis";
import FloatingBar from './pages/FloatingBar';
import PromptTesting from './pages/PromptTesting';
import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

const NotFound = () => (
  <div className="flex items-center justify-center h-screen">
    <h1 className="text-4xl text-white">404 - Not Found</h1>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/signup" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/analysis" element={
                <ProtectedRoute>
                  <Analysis />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/personalize" element={
                <ProtectedRoute>
                  <Personalize />
                </ProtectedRoute>
              } />
              <Route path="/prompt-testing" element={
                <ProtectedRoute>
                  <AdminRoute>
                    <PromptTesting />
                  </AdminRoute>
                </ProtectedRoute>
              } />
              <Route path="/floating-bar" element={<FloatingBar />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UserProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
