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
import { OtherPreferences } from '@/components/OtherPreferences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const convertToSeconds = (value: string, unit: string): number => {
  const numValue = parseInt(value);
  if (isNaN(numValue)) return 0;
  
  switch (unit) {
    case 'hour':
      return numValue * 3600;
    case 'minute':
      return numValue * 60;
    case 'second':
    default:
      return numValue;
  }
};

const convertFromSeconds = (seconds: number): { value: string, unit: string } => {
  if (seconds % 3600 === 0 && seconds > 0) {
    return { value: (seconds / 3600).toString(), unit: 'hour' };
  } else if (seconds % 60 === 0 && seconds > 0) {
    return { value: (seconds / 60).toString(), unit: 'minute' };
  } else {
    return { value: seconds.toString(), unit: 'second' };
  }
};

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
    analysisInterval: user.analysisInterval,
    analysisIntervalUnit: user.analysisIntervalUnit,
  });

  // Load user data from database on component mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!authUser?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('settings, screenshot_interval')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error loading user data:', error);
          return;
        }

        if (data) {
          const settings = data.settings || {};
          const screenshotInterval = data.screenshot_interval || 0;
          const { value: analysisInterval, unit: analysisIntervalUnit } = convertFromSeconds(screenshotInterval);
          
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
            analysisInterval,
            analysisIntervalUnit,
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
            analysisInterval,
            analysisIntervalUnit,
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

      const screenshotInterval = convertToSeconds(
        tradingPreferences.analysisInterval,
        tradingPreferences.analysisIntervalUnit
      );

      // Update both settings and screenshot_interval
      const { error } = await supabase
        .from('users')
        .update({
          settings: {
            ...user,
            ...tradingPreferences,
          },
          screenshot_interval: screenshotInterval
        })
        .eq('id', authUser.id);

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      // Update local context
      setUser({ ...user, ...tradingPreferences });
      console.log('Trading preferences updated successfully:', tradingPreferences);
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
    analysisInterval: user.analysisInterval,
    analysisIntervalUnit: user.analysisIntervalUnit,
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
          <p className="subtitle">Configure your trading preferences to personalize your AI analyses</p>
        </div>
        
        <Card className="glass-effect border border-white/20 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Trading Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTradingPreferencesUpdate} className="space-y-6">
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
                <Label className="text-gray-300">Risk Tolerance</Label>
                <RadioGroup
                  value={tradingPreferences.riskTolerance}
                  onValueChange={(value) => handleTradingInputChange('riskTolerance', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk1-personalize" />
                    <Label htmlFor="risk1-personalize" className="text-gray-300">Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk2-personalize" />
                    <Label htmlFor="risk2-personalize" className="text-gray-300">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk3-personalize" />
                    <Label htmlFor="risk3-personalize" className="text-gray-300">High</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="positions-personalize" className="text-gray-300">Expected Maximum Simultaneous Positions</Label>
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

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="analysisInterval-personalize" className="text-gray-300">Time Between Analyses</Label>
                  <Input
                    id="analysisInterval-personalize"
                    type="number"
                    value={tradingPreferences.analysisInterval}
                    onChange={(e) => handleTradingInputChange('analysisInterval', e.target.value)}
                    className="bg-white/5 border-white/20 text-white focus:border-white/40"
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Interval Unit</Label>
                  <Select
                    value={tradingPreferences.analysisIntervalUnit}
                    onValueChange={(value) => handleTradingInputChange('analysisIntervalUnit', value)}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-white/40">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="second">Second</SelectItem>
                      <SelectItem value="minute">Minute</SelectItem>
                      <SelectItem value="hour">Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <OtherPreferences
          preferences={{
            timeframes: tradingPreferences.timeframes,
            portfolioSize: tradingPreferences.portfolioSize,
            psychologicalFlaws: tradingPreferences.psychologicalFlaws,
          }}
          onPreferenceChange={handleTradingInputChange}
        />
      </div>
    </Layout>
  );
};

export default Personalize; 