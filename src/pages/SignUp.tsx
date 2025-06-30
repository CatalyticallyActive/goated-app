import React, { useState } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

const SignUp = () => {
  const { user, setUser } = useUser();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Handle signup logic here
    console.log('Signup attempt:', { email: user.email, password });
    // Redirect to onboarding
    navigate('/onboarding');
  };

  const handleGoogleSignup = () => {
    // Handle Google signup
    console.log('Google signup');
    navigate('/onboarding');
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
        <div className="gradient-mesh absolute inset-0 opacity-20"></div>
        <div className="animate-fade-in relative z-10">
          <Card className="w-full max-w-md glass-effect border border-white/20 hover:border-white/30 transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <CardTitle className="title-xl text-white">Create Account</CardTitle>
              <p className="text-gray-300 text-lg">Get started with Goated AI</p>
            </CardHeader>
            
            <CardContent className="space-y-8">
              <Button 
                onClick={handleGoogleSignup}
                variant="outline" 
                className="w-full border-white/20 text-white hover:bg-white/10 h-14 text-lg font-medium glass-effect hover:border-white/30 transition-all duration-300"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 text-gray-400 text-base">Or create account with email</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-white text-base font-medium">Email</Label>
                  <Input 
                    id="email"
                    type="email" 
                    value={user.email}
                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                    className="glass-effect border-white/20 text-white placeholder:text-gray-400 h-14 text-base hover:border-white/30 focus:border-white/30 transition-all duration-300"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-white text-base font-medium">Password</Label>
                  <Input 
                    id="password"
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-effect border-white/20 text-white placeholder:text-gray-400 h-14 text-base hover:border-white/30 focus:border-white/30 transition-all duration-300"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" className="text-white text-base font-medium">Confirm Password</Label>
                  <Input 
                    id="confirmPassword"
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-effect border-white/20 text-white placeholder:text-gray-400 h-14 text-base hover:border-white/30 focus:border-white/30 transition-all duration-300"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full neon-silver text-black h-14 font-semibold text-lg neon-glow transition-all duration-300 hover:scale-105">
                  Create Account
                </Button>
              </form>
              
              <div className="text-center space-y-6">
                <p className="text-gray-400 text-base">
                  Already have an account?{' '}
                  <Link to="/login" className="text-white hover:text-gray-300 transition-colors font-medium">
                    Sign in
                  </Link>
                </p>
                
                <div className="text-sm text-gray-400 text-center leading-relaxed">
                  By creating an account, you agree to our{' '}
                  <Link to="/terms" className="text-white hover:text-gray-300 transition-colors">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-white hover:text-gray-300 transition-colors">Privacy Policy</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SignUp;
