import React, { useState, useEffect } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const { user, setUser } = useUser();
  
  const navigate = useNavigate();

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [step]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setUser({ ...user, [field]: value });
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Data is already updated in the context
      console.log('Final form data:', user);
      navigate('/settings');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <div className="gradient-mesh absolute inset-0 opacity-20"></div>
        <div className="animate-fade-in relative z-10">
          <Card className="w-full max-w-2xl glass-card border border-white/20 hover:border-white/30 transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <CardTitle className="title-xl text-white">
                Welcome to Goated AI
              </CardTitle>
              <p className="text-gray-300 text-lg mb-6">
                Let's personalize your trading assistant (Step {step} of 3)
              </p>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(step / 3) * 100}%` }}
                ></div>
              </div>
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
                    <Label htmlFor="risk">Risk Tolerance (1-10)</Label>
                    <Input 
                      id="risk"
                      type="number"
                      min="1"
                      max="10"
                      value={user.riskTolerance}
                      onChange={(e) => handleInputChange('riskTolerance', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                    />
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
                  
                  <div className="glass-card p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Model Selection</h4>
                    <p className="text-gray-300 text-sm">
                      Your personalized AI assistant will be configured based on all the information provided above.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <h3 className="text-2xl font-semibold text-white mb-6">Basic Information</h3>
                  <p className="text-gray-300 mb-6">This information helps us understand our users better for product improvement.</p>
                  
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-white text-base font-medium">Full Name</Label>
                    <Input 
                      id="name"
                      value={user.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      required
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
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="position">Current Position/Occupation</Label>
                    <Input 
                      id="position"
                      value={user.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Years of Trading Experience</Label>
                    <RadioGroup 
                      value={user.tradingExperience}
                      onValueChange={(value) => handleInputChange('tradingExperience', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="0-1" id="exp1" />
                        <Label htmlFor="exp1" className="text-white">0-1 years</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1-3" id="exp2" />
                        <Label htmlFor="exp2" className="text-white">1-3 years</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="3-6" id="exp3" />
                        <Label htmlFor="exp3" className="text-white">3-6 years</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="6+" id="exp4" />
                        <Label htmlFor="exp4" className="text-white">6+ years</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label>Trading Frequency</Label>
                    <RadioGroup 
                      value={user.tradingFrequency}
                      onValueChange={(value) => handleInputChange('tradingFrequency', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="freq1" />
                        <Label htmlFor="freq1" className="text-white">Daily</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="freq2" />
                        <Label htmlFor="freq2" className="text-white">Weekly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="freq3" />
                        <Label htmlFor="freq3" className="text-white">Monthly</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label htmlFor="problems">Biggest Problems in Trading</Label>
                    <Textarea 
                      id="problems"
                      value={user.biggestProblems}
                      onChange={(e) => handleInputChange('biggestProblems', e.target.value)}
                      className="glass-effect border-white/20 text-white h-12 hover:border-white/30 focus:border-white/50 transition-all duration-300"
                      rows={3}
                      placeholder="e.g., Emotional discipline, finding good setups..."
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-between pt-8">
                {step > 1 && (
                  <Button 
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  className="ml-auto"
                >
                  {step === 3 ? 'Complete Setup' : 'Next'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Onboarding;
