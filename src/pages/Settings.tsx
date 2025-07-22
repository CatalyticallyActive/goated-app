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
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import AnalysisDisplay from '@/components/AnalysisDisplay';
import GoatedAIControls from '@/components/GoatedAIControls';

const Settings = () => {
  const { user, setUser } = useUser();
  const { user: authUser, session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Local state for password fields and saving status
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Form data derived from context for editing
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    position: user.position,
  });

  const { toast } = useToast();

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
            age: settings.age || '',
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
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [authUser?.id, setUser]);

  // Update local state when user from context changes
  useEffect(() => {
    if (!isLoading) {
      setProfileData({
        name: user.name,
        email: user.email,
        position: user.position,
      });
    }
  }, [user, isLoading]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    
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
            ...profileData,
          }
        })
        .eq('id', authUser.id);

      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }

      // Update local context
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
    
    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }
    
    setIsPasswordSaving(true);
    
    try {
      // Use Supabase's updateUser method to change password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      console.log('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert(`Failed to change password: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleProfileInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  // Check if there are unsaved changes
  const hasProfileChanges = JSON.stringify(profileData) !== JSON.stringify({
    name: user.name,
    email: user.email,
    position: user.position,
  });



  const hasPasswordData = passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword;

  // Function to save screenshot to Supabase
  const saveScreenshotToSupabase = async (screenshotData: string, userId: string) => {
    try {
      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64Data = screenshotData.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Generate unique file path: ${user_id}/${timestamp}.png
      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}.png`;
      
      // Convert base64 to binary data for upload
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      console.log('Attempting to upload screenshot to temp-screenshots bucket...');
      
      // Upload to temp-screenshots bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-screenshots')
        .upload(filename, binaryData, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading screenshot to storage:', uploadError);
        
        // Check if it's a bucket not found error
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('400')) {
          console.error('The temp-screenshots bucket does not exist. Please create it in your Supabase dashboard.');
          throw new Error('Storage bucket not configured. Please contact support.');
        }
        
        // Check if it's an RLS policy error
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('403')) {
          console.error('RLS policy is blocking the upload. Please check bucket policies.');
          throw new Error('Access denied. Please check your permissions.');
        }
        
        throw uploadError;
      }

      console.log('Screenshot uploaded successfully:', uploadData);

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('temp-screenshots')
        .getPublicUrl(filename);

      console.log('Public URL generated:', urlData.publicUrl);

      // Try to call RPC function to insert database record
      let dbData = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('insert_screenshot', {
          p_screenshot_url: urlData.publicUrl,
          p_user_id: userId
        });

        if (rpcError) {
          console.error('RPC function not found, trying direct insert:', rpcError);
          
          // Fallback: Direct insert into temp_screenshots table
          const { data: directData, error: directError } = await supabase
            .from('temp_screenshots')
            .insert({
              screenshot_url: urlData.publicUrl,
              status: 'received'
            })
            .select()
            .single();

          if (directError) {
            console.error('Direct insert also failed:', directError);
            throw directError;
          }

          dbData = directData;
          console.log('Screenshot saved via direct insert:', dbData);
        } else {
          dbData = rpcData;
          console.log('Screenshot saved via RPC:', dbData);
        }
      } catch (error) {
        console.error('All database insert methods failed:', error);
        // Don't throw here - we still want to continue with AI analysis
        console.log('Continuing with AI analysis despite database insert failure');
      }

      return dbData;
    } catch (error) {
      console.error('Failed to save screenshot to Supabase:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading your settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* No hidden ref */}
      {/* Header */}
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
          <TabsList className="grid w-full grid-cols-3 glass-effect border border-white/20">
            <TabsTrigger value="profile" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Profile</TabsTrigger>
            <TabsTrigger value="privacy" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Privacy</TabsTrigger>
            <TabsTrigger value="billing" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-white/10">Billing</TabsTrigger>


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
                        disabled
                        className="bg-white/5 border-white/20 text-gray-400 cursor-not-allowed"
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




        </Tabs>
      </div>
      <GoatedAIControls />
      <AnalysisDisplay />
    </Layout>
  );
};

export default Settings;
