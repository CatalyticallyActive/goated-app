import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

interface OtherPreferencesProps {
  preferences: {
    timeframes: string;
    portfolioSize: string;
    psychologicalFlaws: string;
  };
  onPreferenceChange: (field: string, value: string) => void;
}

export const OtherPreferences: React.FC<OtherPreferencesProps> = ({
  preferences,
  onPreferenceChange,
}) => {
  return (
    <Card className="glass-effect border border-white/20 max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-white">Other Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label className="text-gray-300">Usual Timeframes</Label>
            <RadioGroup
              value={preferences.timeframes}
              onValueChange={(value) => onPreferenceChange('timeframes', value)}
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

          <div>
            <Label htmlFor="portfolio-personalize" className="text-gray-300">Portfolio Size</Label>
            <Input
              id="portfolio-personalize"
              value={preferences.portfolioSize}
              onChange={(e) => onPreferenceChange('portfolioSize', e.target.value)}
              className="bg-white/5 border-white/20 text-white focus:border-white/40"
              placeholder="e.g., $10,000"
            />
          </div>

          <div>
            <Label htmlFor="flaws-personalize" className="text-gray-300">Pre-identified Trading Psychological Flaws</Label>
            <Textarea
              id="flaws-personalize"
              value={preferences.psychologicalFlaws}
              onChange={(e) => onPreferenceChange('psychologicalFlaws', e.target.value)}
              className="bg-white/5 border-white/20 text-white focus:border-white/40"
              rows={3}
              placeholder="e.g., I tend to hold losing positions too long, I overtrade when bored..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 