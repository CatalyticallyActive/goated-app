import React, { useState, useEffect } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabaseClient';

const SignUp = () => {
  const { user, setUser } = useUser();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setUser({ ...user, [field]: value });
  };

  const handleNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGoogleSignup = () => {
    // Handle Google signup
    console.log('Google signup');
    navigate('/settings');
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (!user.email || !password) {
      alert('Please enter both email and password');
      return;
    }
    
    if (password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      console.log('Attempting signup with:', { email: user.email, password, userData: user });

      // Create auth user - trigger will handle database operations
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: password,
        options: {
          data: {
            name: user.name || '',
            age: user.age || '',
            position: user.position || '',
            tradingExperience: user.tradingExperience || '',
            tradingFrequency: user.tradingFrequency || '',
            biggestProblems: user.biggestProblems || '',
            tradingStyle: user.tradingStyle || '',
            timeframes: user.timeframes || '',
            portfolioSize: user.portfolioSize || '',
            riskTolerance: user.riskTolerance || '',
            maxPositions: user.maxPositions || '',
            dailyLossLimit: user.dailyLossLimit || '',
            psychologicalFlaws: user.psychologicalFlaws || '',
            otherInstructions: user.otherInstructions || '',
            signupCode: user.signupCode || '',
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(authError.message);
      }

      const authUser = authData.user;
      if (!authUser) {
        throw new Error('User creation failed');
      }

      // Clear UserContext
      setUser({
        name: "",
        email: "",
        age: "",
        position: "",
        tradingExperience: "",
        tradingFrequency: "",
        biggestProblems: "",
        tradingStyle: "",
        timeframes: "",
        portfolioSize: "",
        riskTolerance: "",
        maxPositions: "",
        dailyLossLimit: "",
        psychologicalFlaws: "",
        otherInstructions: "",
        signupCode: "",
      });

      console.log('User signed up successfully:', authUser.email);
      navigate('/settings');
    } catch (error) {
      console.error('Signup error:', error.message, error);
      alert(`Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <div className="gradient-mesh absolute inset-0 opacity-20"></div>
        <div className="animate-fade-in relative z-10">
          <Card className={`w-full ${step === 5 ? 'max-w-md' : 'max-w-2xl'} glass-card border border-white/20 hover:border-white/30 transition-all duration-300`}>
            <CardHeader className="text-center pb-8">
              <CardTitle className="title-xl text-white">Create Account</CardTitle>
              <p className="text-gray-300 text-lg mb-6">
                {step < 4 ? `Let's personalize your trading assistant (Step ${step} of 3)` : step === 4 ? 'Do you have a sign up code?' : 'Sign up to save your profile'}
              </p>
              {step < 4 && (
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div 
                    className="bg-white h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(step / 3) * 100}%` }}
                  ></div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-8">
              {step === 1 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-semibold text-white mb-6">Trading Preferences</h3>
                  <div>
                    <Label>Trading Style</Label>
                    <RadioGroup 
                      value={user.tradingStyle}
                      onValueChange={(value) => handleInputChange('tradingStyle', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="day-trader" id="style1" />
                        <Label htmlFor="style1" className="text-white">Day Trader</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="scalping" id="style2" />
                        <Label htmlFor="style2" className="text-white">Scalping</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="long-term" id="style3" />
                        <Label htmlFor="style3" className="text-white">Long Term</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Usual Timeframes</Label>
                    <RadioGroup 
                      value={user.timeframes}
                      onValueChange={(value) => handleInputChange('timeframes', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="15min" id="time1" />
                        <Label htmlFor="time1" className="text-white">15 minutes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1h" id="time2" />
                        <Label htmlFor="time2" className="text-white">1 hour</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1d" id="time3" />
                        <Label htmlFor="time3" className="text-white">1 day</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1w" id="time4" />
                        <Label htmlFor="time4" className="text-white">1 week</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1m" id="time5" />
                        <Label htmlFor="time5" className="text-white">1 month</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="portfolio">Portfolio Size</Label>
                    <Input 
                      id="portfolio"
                      value={user.portfolioSize}
                      onChange={(e) => handleInputChange('portfolioSize', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="e.g., $10,000"
                    />
                  </div>
                  <div>
                    <Label>Risk Tolerance</Label>
                    <RadioGroup 
                      value={user.riskTolerance}
                      onValueChange={(value) => handleInputChange('riskTolerance', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="risk1" />
                        <Label htmlFor="risk1" className="text-white">Low</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="risk2" />
                        <Label htmlFor="risk2" className="text-white">Medium</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="risk3" />
                        <Label htmlFor="risk3" className="text-white">High</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="positions">Maximum Simultaneous Positions</Label>
                    <Input 
                      id="positions"
                      type="number"
                      value={user.maxPositions}
                      onChange={(e) => handleInputChange('maxPositions', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lossLimit">Daily Loss Limit ($ or %)</Label>
                    <Input 
                      id="lossLimit"
                      value={user.dailyLossLimit}
                      onChange={(e) => handleInputChange('dailyLossLimit', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="e.g., $500 or 5%"
                    />
                  </div>
                  <div className="flex justify-between mt-8">
                    <div></div>
                    <Button onClick={handleNext}>Next</Button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-semibold text-white mb-6">Advanced Settings</h3>
                  <div>
                    <Label htmlFor="flaws">Pre-identified Trading Psychological Flaws</Label>
                    <Textarea 
                      id="flaws"
                      value={user.psychologicalFlaws}
                      onChange={(e) => handleInputChange('psychologicalFlaws', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      rows={3}
                      placeholder="e.g., FOMO, overtrading, revenge trading..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructions">Other Instructions</Label>
                    <Textarea 
                      id="instructions"
                      value={user.otherInstructions}
                      onChange={(e) => handleInputChange('otherInstructions', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      rows={4}
                      placeholder="e.g., Do not use RSI indicator, Use only moving averages when..."
                    />
                  </div>
                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>Back</Button>
                    <Button onClick={handleNext}>Next</Button>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-semibold text-white mb-6">Personal Information</h3>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name"
                      value={user.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input 
                      id="age"
                      type="number"
                      value={user.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="Your age"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input 
                      id="position"
                      value={user.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="e.g., Student, Professional Trader, Hobbyist"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tradingExperience">Trading Experience (years)</Label>
                    <Input 
                      id="tradingExperience"
                      type="number"
                      value={user.tradingExperience}
                      onChange={(e) => handleInputChange('tradingExperience', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="e.g., 2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tradingFrequency">Trading Frequency</Label>
                    <Input 
                      id="tradingFrequency"
                      value={user.tradingFrequency}
                      onChange={(e) => handleInputChange('tradingFrequency', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="e.g., Daily, Weekly, Monthly"
                    />
                  </div>
                  <div>
                    <Label htmlFor="biggestProblems">Biggest Problems in Trading</Label>
                    <Textarea 
                      id="biggestProblems"
                      value={user.biggestProblems}
                      onChange={(e) => handleInputChange('biggestProblems', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      rows={3}
                      placeholder="e.g., Risk management, discipline, emotional control..."
                    />
                  </div>
                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>Back</Button>
                    <Button onClick={handleNext}>Next</Button>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-semibold text-white mb-6">Sign Up Code (Optional)</h3>
                  <div>
                    <Label htmlFor="signupCode">If you have a sign up code, enter it below:</Label>
                    <Input
                      id="signupCode"
                      value={signupCode}
                      onChange={(e) => setSignupCode(e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      placeholder="Enter sign up code (optional)"
                    />
                  </div>
                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>Back</Button>
                    <Button onClick={() => { setUser({ ...user, signupCode }); setStep(5); }}>Next</Button>
                  </div>
                </div>
              )}
              {step === 5 && (
                <>
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
                  <div className="relative mt-8 mb-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 text-gray-400 text-base">Or create account with email</span>
                    </div>
                  </div>
                  <form onSubmit={handleEmailSignup} className="space-y-6">
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
                      Finish Signup
                    </Button>
                  </form>
                </>
              )}
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
