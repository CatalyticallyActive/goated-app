import React, { useState, useEffect } from 'react';
import Layout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { useUser } from '@/context/UserContext';

const Settings = () => {
  const { user, setUser } = useUser();

  // Local state for password fields and saving status
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isTradingPrefsSaving, setIsTradingPrefsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Form data derived from context for editing
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    age: user.age,
    position: user.position,
    tradingExperience: user.tradingExperience,
    tradingFrequency: user.tradingFrequency,
    biggestProblems: user.biggestProblems,
  });

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

  // Update local state when user from context changes
  useEffect(() => {
    setProfileData({
      name: user.name,
      email: user.email,
      age: user.age,
      position: user.position,
      tradingExperience: user.tradingExperience,
      tradingFrequency: user.tradingFrequency,
      biggestProblems: user.biggestProblems,
    });
    setTradingPreferences({
      tradingStyle: user.tradingStyle,
      timeframes: user.timeframes,
      portfolioSize: user.portfolioSize,
      riskTolerance: user.riskTolerance,
      maxPositions: user.maxPositions,
      dailyLossLimit: user.dailyLossLimit,
      psychologicalFlaws: user.psychologicalFlaws,
      otherInstructions: user.otherInstructions,
    });
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({ ...user, ...profileData });
      console.log('Profile updated successfully:', profileData);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      alert('Please fill in all password fields');
      return;
    }
    
    setIsPasswordSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please try again.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleTradingPreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTradingPrefsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({ ...user, ...tradingPreferences });
      console.log('Trading preferences updated successfully:', tradingPreferences);
      alert('Trading preferences updated successfully!');
    } catch (error) {
      console.error('Failed to update trading preferences:', error);
      alert('Failed to update trading preferences. Please try again.');
    } finally {
      setIsTradingPrefsSaving(false);
    }
  };

  const handleProfileInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleTradingInputChange = (field: string, value: string) => {
    setTradingPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  // Check if there are unsaved changes
  const hasProfileChanges = JSON.stringify(profileData) !== JSON.stringify({
    name: user.name,
    email: user.email,
    age: user.age,
    position: user.position,
    tradingExperience: user.tradingExperience,
    tradingFrequency: user.tradingFrequency,
    biggestProblems: user.biggestProblems,
  });

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

  const hasPasswordData = passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword;

  return (
    <Layout>
      {/* Hero Section */}
      <section className="section py-12 relative">
        <div className="container py-8 relative">
          <div className="text-center">
            <h1 className="title-xl text-white mb-0">Account Settings</h1>
            <p className="subtitle">Manage your account and preferences</p>
          </div>
        </div>
      </section>

      <div className="container py-0">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 glass-effect border border-white/20">
            <TabsTrigger value="profile" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Profile</TabsTrigger>
            <TabsTrigger value="privacy" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Privacy</TabsTrigger>
            <TabsTrigger value="billing" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Billing</TabsTrigger>
            <TabsTrigger value="history" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">History</TabsTrigger>
            <TabsTrigger value="assistant" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card className="glass-effect border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                      <Input 
                        id="name"
                        value={profileData.name}
                        onChange={(e) => handleProfileInputChange('name', e.target.value)}
                        className="bg-white/5 border-white/20 text-white focus:border-white/40"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input 
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleProfileInputChange('email', e.target.value)}
                        className="bg-white/5 border-white/20 text-white focus:border-white/40"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age" className="text-gray-300">Age</Label>
                        <Input 
                          id="age"
                          type="number"
                          value={profileData.age}
                          onChange={(e) => handleProfileInputChange('age', e.target.value)}
                          className="bg-white/5 border-white/20 text-white focus:border-white/40"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="position" className="text-gray-300">Current Position/Occupation</Label>
                        <Input 
                          id="position"
                          value={profileData.position}
                          onChange={(e) => handleProfileInputChange('position', e.target.value)}
                          className="bg-white/5 border-white/20 text-white focus:border-white/40"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-gray-300">Years of Trading Experience</Label>
                      <RadioGroup 
                        value={profileData.tradingExperience}
                        onValueChange={(value) => handleProfileInputChange('tradingExperience', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1-3" id="exp1" />
                          <Label htmlFor="exp1" className="text-white">1-3 years</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3-6" id="exp2" />
                          <Label htmlFor="exp2" className="text-white">3-6 years</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="6+" id="exp3" />
                          <Label htmlFor="exp3" className="text-white">6+ years</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label className="text-gray-300">Trading Frequency</Label>
                      <RadioGroup
                        value={profileData.tradingFrequency}
                        onValueChange={(value) => handleProfileInputChange('tradingFrequency', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="freq1" />
                          <Label htmlFor="freq1">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="freq2" />
                          <Label htmlFor="freq2">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="freq3" />
                          <Label htmlFor="freq3">Monthly</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <Label htmlFor="problems" className="text-gray-300">Biggest Problems in Trading</Label>
                      <Textarea 
                        id="problems"
                        value={profileData.biggestProblems}
                        onChange={(e) => handleProfileInputChange('biggestProblems', e.target.value)}
                        className="bg-white/5 border-white/20 text-white focus:border-white/40"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="neon-blue" disabled={!hasProfileChanges || isProfileSaving}>
                        {isProfileSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="glass-effect border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="neon-blue" disabled={!hasPasswordData || isPasswordSaving}>
                        {isPasswordSaving ? 'Saving...' : 'Change Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="glass-effect border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Data Collection</h3>
                  <p className="text-gray-400 mb-4">
                    We collect minimal data to improve your trading assistant experience.
                  </p>
                  <Link to="/privacy" className="text-white hover:text-gray-300 transition-colors underline">
                    View Privacy Policy
                  </Link>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Account Deletion</h3>
                  <p className="text-gray-400 mb-4">
                    If you wish to delete your account, please contact support.
                  </p>
                  <Button className="glass-effect border border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300">
                    Request Account Deletion
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card className="glass-effect border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Billing & Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="glass-effect border border-white/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-white">Current Plan</h3>
                    <span className="bg-white/10 text-white px-3 py-1 rounded-full text-sm border border-white/20">Pro</span>
                  </div>
                  <p className="text-gray-400">$29/month - AI Trading Assistant</p>
                  <p className="text-sm text-gray-500 mt-2">Next billing date: January 15, 2024</p>
                </div>
                
                <div className="space-y-3">
                  <Link to="/pricing">
                    <Button className="w-full neon-silver text-black font-medium transition-all duration-300 hover:scale-105">
                      Upgrade Plan
                    </Button>
                  </Link>
                  <Button className="w-full glass-effect border border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300">
                    Cancel Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="glass-effect border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-b border-white/20 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">Chart Analysis - EURUSD</h4>
                        <p className="text-gray-400 text-sm">AI identified bullish pattern</p>
                      </div>
                      <span className="text-gray-500 text-sm">2 hours ago</span>
                    </div>
                  </div>
                  <div className="border-b border-white/20 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">Settings Updated</h4>
                        <p className="text-gray-400 text-sm">Risk tolerance changed to 7</p>
                      </div>
                      <span className="text-gray-500 text-sm">1 day ago</span>
                    </div>
                  </div>
                  <div className="border-b border-white/20 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">Chart Analysis - BTCUSD</h4>
                        <p className="text-gray-400 text-sm">AI suggested position adjustment</p>
                      </div>
                      <span className="text-gray-500 text-sm">2 days ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assistant">
            <Card className="glass-effect border border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Trading Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTradingPreferencesUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Trading Style</Label>
                      <RadioGroup
                        value={tradingPreferences.tradingStyle}
                        onValueChange={(value) => handleTradingInputChange('tradingStyle', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="day-trader" id="style1-settings" />
                          <Label htmlFor="style1-settings">Day Trader</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="scalping" id="style2-settings" />
                          <Label htmlFor="style2-settings">Scalping</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="long-term" id="style3-settings" />
                          <Label htmlFor="style3-settings">Long Term</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Usual Timeframes</Label>
                      <RadioGroup
                        value={tradingPreferences.timeframes}
                        onValueChange={(value) => handleTradingInputChange('timeframes', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="15min" id="time1-settings" />
                          <Label htmlFor="time1-settings">15 minutes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1h" id="time2-settings" />
                          <Label htmlFor="time2-settings">1 hour</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1d" id="time3-settings" />
                          <Label htmlFor="time3-settings">1 day</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1w" id="time4-settings" />
                          <Label htmlFor="time4-settings">1 week</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1m" id="time5-settings" />
                          <Label htmlFor="time5-settings">1 month</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="portfolio-settings">Portfolio Size</Label>
                      <Input
                        id="portfolio-settings"
                        value={tradingPreferences.portfolioSize}
                        onChange={(e) => handleTradingInputChange('portfolioSize', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="risk-settings">Risk Tolerance (1-10)</Label>
                      <Input
                        id="risk-settings"
                        type="number"
                        min="1"
                        max="10"
                        value={tradingPreferences.riskTolerance}
                        onChange={(e) => handleTradingInputChange('riskTolerance', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="positions-settings">Maximum Simultaneous Positions</Label>
                      <Input
                        id="positions-settings"
                        type="number"
                        value={tradingPreferences.maxPositions}
                        onChange={(e) => handleTradingInputChange('maxPositions', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lossLimit-settings">Daily Loss Limit ($ or %)</Label>
                      <Input
                        id="lossLimit-settings"
                        value={tradingPreferences.dailyLossLimit}
                        onChange={(e) => handleTradingInputChange('dailyLossLimit', e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="flaws-settings">Pre-identified Trading Psychological Flaws</Label>
                    <Textarea
                      id="flaws-settings"
                      value={tradingPreferences.psychologicalFlaws}
                      onChange={(e) => handleTradingInputChange('psychologicalFlaws', e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="instructions-settings">Other Instructions</Label>
                    <Textarea
                      id="instructions-settings"
                      value={tradingPreferences.otherInstructions}
                      onChange={(e) => handleTradingInputChange('otherInstructions', e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="neon-blue" disabled={!hasTradingChanges || isTradingPrefsSaving}>
                      {isTradingPrefsSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
