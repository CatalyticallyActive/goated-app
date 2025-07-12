import React, { useState, useEffect } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const Personalize = () => {
  const { user, setUser } = useUser();
  const { user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [tradingPreferences, setTradingPreferences] = useState({
    tradingStyle: user.tradingStyle,
    timeframes: user.timeframes,
    portfolioSize: user.portfolioSize,
    riskTolerance: user.riskTolerance,
    maxPositions: user.maxPositions,
    dailyLossLimit: user.dailyLossLimit,
    psychologicalFlaws: user.psychologicalFlaws,
    otherInstructions: user.otherInstructions,
  });

  // Load user data from database on component mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!authUser?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('settings')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error loading user data:', error);
          return;
        }

        if (data?.settings) {
          const settings = data.settings;
          const userData = {
            name: settings.name || '',
            email: authUser.email || '',
            position: settings.position || '',
            tradingStyle: settings.tradingStyle || '',
            timeframes: settings.timeframes || '',
            portfolioSize: settings.portfolioSize || '',
            riskTolerance: settings.riskTolerance || '',
            maxPositions: settings.maxPositions || '',
            dailyLossLimit: settings.dailyLossLimit || '',
            psychologicalFlaws: settings.psychologicalFlaws || '',
            otherInstructions: settings.otherInstructions || '',
            signupCode: settings.signupCode || '',
          };
          
          setUser(userData);
          setTradingPreferences({
            tradingStyle: userData.tradingStyle,
            timeframes: userData.timeframes,
            portfolioSize: userData.portfolioSize,
            riskTolerance: userData.riskTolerance,
            maxPositions: userData.maxPositions,
            dailyLossLimit: userData.dailyLossLimit,
            psychologicalFlaws: userData.psychologicalFlaws,
            otherInstructions: userData.otherInstructions,
          });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [authUser?.id, setUser]);

  const handleTradingPreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (!authUser?.id) {
        throw new Error('User not authenticated');
      }

      // Update the settings in the database
      const { error } = await supabase
        .from('users')
        .update({
          settings: {
            ...user,
            ...tradingPreferences,
          }
        })
        .eq('id', authUser.id);

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      // Update local context
      setUser({ ...user, ...tradingPreferences });
      console.log('Trading preferences updated successfully:', tradingPreferences);
      alert('Trading preferences updated successfully!');
    } catch (error) {
      console.error('Failed to update trading preferences:', error);
      alert('Failed to update trading preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTradingInputChange = (field: string, value: string) => {
    setTradingPreferences(prev => ({ ...prev, [field]: value }));
  };

  // Check if there are unsaved changes
  const hasTradingChanges = JSON.stringify(tradingPreferences) !== JSON.stringify({
    tradingStyle: user.tradingStyle,
    timeframes: user.timeframes,
    portfolioSize: user.portfolioSize,
    riskTolerance: user.riskTolerance,
    maxPositions: user.maxPositions,
    dailyLossLimit: user.dailyLossLimit,
    psychologicalFlaws: user.psychologicalFlaws,
    otherInstructions: user.otherInstructions,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading your preferences...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center mb-8">
          <h1 className="title-xl text-white mb-2">Personalize Your Assistant</h1>
          <p className="subtitle">Configure your trading preferences to get personalized AI insights</p>
        </div>
        
        <Card className="glass-effect border border-white/20 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Trading Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTradingPreferencesUpdate} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-300">Trading Style</Label>
                  <RadioGroup
                    value={tradingPreferences.tradingStyle}
                    onValueChange={(value) => handleTradingInputChange('tradingStyle', value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="day-trader" id="style1-personalize" />
                      <Label htmlFor="style1-personalize" className="text-gray-300">Day Trader</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scalping" id="style2-personalize" />
                      <Label htmlFor="style2-personalize" className="text-gray-300">Scalping</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="long-term" id="style3-personalize" />
                      <Label htmlFor="style3-personalize" className="text-gray-300">Long Term</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-gray-300">Usual Timeframes</Label>
                  <RadioGroup
                    value={tradingPreferences.timeframes}
                    onValueChange={(value) => handleTradingInputChange('timeframes', value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="15min" id="time1-personalize" />
                      <Label htmlFor="time1-personalize" className="text-gray-300">15 minutes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1h" id="time2-personalize" />
                      <Label htmlFor="time2-personalize" className="text-gray-300">1 hour</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1d" id="time3-personalize" />
                      <Label htmlFor="time3-personalize" className="text-gray-300">1 day</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1w" id="time4-personalize" />
                      <Label htmlFor="time4-personalize" className="text-gray-300">1 week</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1m" id="time5-personalize" />
                      <Label htmlFor="time5-personalize" className="text-gray-300">1 month</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="portfolio-personalize" className="text-gray-300">Portfolio Size</Label>
                  <Input
                    id="portfolio-personalize"
                    value={tradingPreferences.portfolioSize}
                    onChange={(e) => handleTradingInputChange('portfolioSize', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="e.g., $10,000"
                  />
                </div>
                <div>
                  <Label htmlFor="risk-personalize" className="text-gray-300">Risk Tolerance (1-10)</Label>
                  <Input
                    id="risk-personalize"
                    type="number"
                    min="1"
                    max="10"
                    value={tradingPreferences.riskTolerance}
                    onChange={(e) => handleTradingInputChange('riskTolerance', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="1-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="positions-personalize" className="text-gray-300">Maximum Simultaneous Positions</Label>
                  <Input
                    id="positions-personalize"
                    type="number"
                    value={tradingPreferences.maxPositions}
                    onChange={(e) => handleTradingInputChange('maxPositions', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <Label htmlFor="lossLimit-personalize" className="text-gray-300">Daily Loss Limit ($ or %)</Label>
                  <Input
                    id="lossLimit-personalize"
                    value={tradingPreferences.dailyLossLimit}
                    onChange={(e) => handleTradingInputChange('dailyLossLimit', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="e.g., $500 or 5%"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="flaws-personalize" className="text-gray-300">Pre-identified Trading Psychological Flaws</Label>
                <Textarea
                  id="flaws-personalize"
                  value={tradingPreferences.psychologicalFlaws}
                  onChange={(e) => handleTradingInputChange('psychologicalFlaws', e.target.value)}
                  className="bg-white/5 border-white/20 text-white focus:border-white/40"
                  rows={3}
                  placeholder="e.g., I tend to hold losing positions too long, I overtrade when bored..."
                />
              </div>

              <div>
                <Label htmlFor="instructions-personalize" className="text-gray-300">Other Instructions</Label>
                <Textarea
                  id="instructions-personalize"
                  value={tradingPreferences.otherInstructions}
                  onChange={(e) => handleTradingInputChange('otherInstructions', e.target.value)}
                  className="bg-white/5 border-white/20 text-white focus:border-white/40"
                  rows={4}
                  placeholder="Any specific instructions or preferences for the AI assistant..."
                />
              </div>

              <div className="flex justify-end pt-6">
                <Button type="submit" className="neon-blue" disabled={!hasTradingChanges || isSaving}>
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Personalize; 