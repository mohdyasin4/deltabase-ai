import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Volume2, Mic, Sparkles } from 'lucide-react';
import { getServiceStatus, speakWithEmotion, type SpeechOptions } from '@/utils/textToSpeech';

interface TTSSettingsProps {
  onClose?: () => void;
}

const TTSSettings: React.FC<TTSSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<SpeechOptions>({
    emotion: 'professional',
    service: 'auto',
    rate: 0.9,
    pitch: 1.0,
    volume: 0.8,
    stability: 0.5,
    similarity_boost: 0.75,
    use_speaker_boost: true,
  });

  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const serviceStatus = getServiceStatus();

  const emotions = [
    { value: 'neutral', label: 'Neutral', description: 'Calm and balanced tone' },
    { value: 'professional', label: 'Professional', description: 'Clear and authoritative' },
    { value: 'empathetic', label: 'Empathetic', description: 'Warm and understanding' },
    { value: 'cheerful', label: 'Cheerful', description: 'Upbeat and positive' },
    { value: 'calm', label: 'Calm', description: 'Soothing and relaxed' },
    { value: 'excited', label: 'Excited', description: 'Energetic and enthusiastic' },
    { value: 'confident', label: 'Confident', description: 'Strong and assured' },
    { value: 'friendly', label: 'Friendly', description: 'Approachable and kind' },
    { value: 'soothing', label: 'Soothing', description: 'Gentle and calming' },
  ];

  const services = [
    { value: 'auto', label: 'Auto-Select Best', description: 'Automatically choose the highest quality available' },
    { value: 'elevenlabs', label: 'ElevenLabs', description: 'Premium emotional voices', premium: true },
    { value: 'openai', label: 'OpenAI TTS', description: 'High-quality neural voices', premium: true },
    { value: 'azure', label: 'Azure Cognitive', description: 'Microsoft neural voices', premium: true },
    { value: 'browser', label: 'Browser TTS', description: 'Built-in browser speech synthesis' },
  ];

  const testText = "This is a test of the selected voice and emotion settings. The AI can explain your data with expressive, natural-sounding speech.";

  const handleTestSpeech = async () => {
    if (isTestPlaying) return;
    
    setIsTestPlaying(true);
    try {
      await speakWithEmotion(testText, settings.emotion!, settings);
    } catch (error) {
      console.error('Test speech failed:', error);
    } finally {
      setIsTestPlaying(false);
    }
  };

  const updateSetting = (key: keyof SpeechOptions, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Text-to-Speech Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="voice" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="voice">Voice & Emotion</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="voice" className="space-y-4">
            <div className="space-y-2">
              <Label>Emotion</Label>
              <Select value={settings.emotion} onValueChange={(value) => updateSetting('emotion', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emotions.map((emotion) => (
                    <SelectItem key={emotion.value} value={emotion.value}>
                      <div className="flex flex-col">
                        <span>{emotion.label}</span>
                        <span className="text-xs text-muted-foreground">{emotion.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Speech Rate</Label>
              <Slider
                value={[settings.rate || 0.9]}
                onValueChange={([value]) => updateSetting('rate', value)}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">Current: {settings.rate?.toFixed(1)}x</div>
            </div>

            <div className="space-y-2">
              <Label>Volume</Label>
              <Slider
                value={[settings.volume || 0.8]}
                onValueChange={([value]) => updateSetting('volume', value)}
                min={0.1}
                max={1.0}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">Current: {Math.round((settings.volume || 0.8) * 100)}%</div>
            </div>
          </TabsContent>

          <TabsContent value="service" className="space-y-4">
            <div className="space-y-2">
              <Label>TTS Service</Label>
              <Select value={settings.service} onValueChange={(value) => updateSetting('service', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem 
                      key={service.value} 
                      value={service.value}
                      disabled={service.premium && !serviceStatus.services[service.value as keyof typeof serviceStatus.services]}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span>{service.label}</span>
                            {service.premium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                            {serviceStatus.services[service.value as keyof typeof serviceStatus.services] && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Available</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{service.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Current Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Best Available:</span>
                  <Badge variant="outline">{serviceStatus.bestService}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Quality Level:</span>
                  <Badge variant="outline">{serviceStatus.capabilities.qualityLevel}</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {settings.service === 'elevenlabs' && (
              <>
                <div className="space-y-2">
                  <Label>Stability</Label>
                  <Slider
                    value={[settings.stability || 0.5]}
                    onValueChange={([value]) => updateSetting('stability', value)}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    Current: {settings.stability?.toFixed(1)} - Higher values make speech more stable but less expressive
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Similarity Boost</Label>
                  <Slider
                    value={[settings.similarity_boost || 0.75]}
                    onValueChange={([value]) => updateSetting('similarity_boost', value)}
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    Current: {settings.similarity_boost?.toFixed(2)} - Higher values enhance voice clarity
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.use_speaker_boost}
                    onCheckedChange={(checked) => updateSetting('use_speaker_boost', checked)}
                  />
                  <Label>Speaker Boost</Label>
                </div>
              </>
            )}

            {(settings.service === 'browser' || settings.service === 'auto') && (
              <div className="space-y-2">
                <Label>Pitch</Label>
                <Slider
                  value={[settings.pitch || 1.0]}
                  onValueChange={([value]) => updateSetting('pitch', value)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">Current: {settings.pitch?.toFixed(1)}x</div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <Button 
            onClick={handleTestSpeech} 
            disabled={isTestPlaying}
            className="flex items-center gap-2"
          >
            {isTestPlaying ? (
              <>
                <Mic className="w-4 h-4 animate-pulse" />
                Playing...
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                Test Voice
              </>
            )}
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Save as Default
          </Button>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TTSSettings;
