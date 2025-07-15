// Text-to-Speech utility functions with enhanced emotional voice support

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  emotion?: 'neutral' | 'cheerful' | 'calm' | 'professional' | 'excited' | 'empathetic' | 'friendly' | 'confident' | 'soothing';
  service?: 'browser' | 'elevenlabs' | 'azure' | 'openai' | 'auto';
  stability?: number; // For ElevenLabs
  similarity_boost?: number; // For ElevenLabs
  use_speaker_boost?: boolean; // For ElevenLabs
}

export const defaultSpeechOptions: SpeechOptions = {
  rate: 0.9,
  pitch: 1,
  volume: 0.8,
  emotion: 'professional',
  service: 'auto', // Auto-select best available service
  stability: 0.5, // ElevenLabs setting
  similarity_boost: 0.75, // ElevenLabs setting
  use_speaker_boost: true, // ElevenLabs setting
};

// Premium voice configurations for different services
const premiumVoiceConfig = {
  elevenlabs: {
    neutral: { voice_id: 'pNInz6obpgDQGcFmaJgB', stability: 0.5, similarity_boost: 0.75 }, // Adam
    cheerful: { voice_id: 'EXAVITQu4vr4xnSDxMaL', stability: 0.6, similarity_boost: 0.8 }, // Bella
    calm: { voice_id: 'ErXwobaYiN019PkySvjV', stability: 0.3, similarity_boost: 0.7 }, // Antoni
    professional: { voice_id: 'VR6AewLTigWG4xSOukaG', stability: 0.4, similarity_boost: 0.75 }, // Arnold
    excited: { voice_id: 'TxGEqnHWrfWFTfGW9XjX', stability: 0.7, similarity_boost: 0.8 }, // Josh
    empathetic: { voice_id: 'oWAxZDx7w5VEj9dCyTzz', stability: 0.4, similarity_boost: 0.8 }, // Grace
    friendly: { voice_id: 'pqHfZKP75CvOlQylNhV4', stability: 0.5, similarity_boost: 0.8 }, // Bill
    confident: { voice_id: 'IKne3meq5aSn9XLyUdCD', stability: 0.6, similarity_boost: 0.75 }, // Charlie
    soothing: { voice_id: 'CYw3kZ02Hs0563khs1Fj', stability: 0.3, similarity_boost: 0.8 }, // Gigi
  },
  openai: {
    neutral: { voice: 'onyx', speed: 1.0 },
    cheerful: { voice: 'nova', speed: 1.1 },
    calm: { voice: 'echo', speed: 0.9 },
    professional: { voice: 'onyx', speed: 1.0 },
    excited: { voice: 'fable', speed: 1.2 },
    empathetic: { voice: 'shimmer', speed: 0.95 },
    friendly: { voice: 'alloy', speed: 1.05 },
    confident: { voice: 'onyx', speed: 1.0 },
    soothing: { voice: 'shimmer', speed: 0.85 },
  },
  azure: {
    neutral: { voice: 'en-US-JennyNeural', style: 'default', rate: 1.0 },
    cheerful: { voice: 'en-US-AriaNeural', style: 'cheerful', rate: 1.1 },
    calm: { voice: 'en-US-DavisNeural', style: 'calm', rate: 0.9 },
    professional: { voice: 'en-US-GuyNeural', style: 'default', rate: 1.0 },
    excited: { voice: 'en-US-JennyNeural', style: 'excited', rate: 1.15 },
    empathetic: { voice: 'en-US-AriaNeural', style: 'empathetic', rate: 0.95 },
    friendly: { voice: 'en-US-JennyNeural', style: 'friendly', rate: 1.05 },
    confident: { voice: 'en-US-GuyNeural', style: 'default', rate: 1.0 },
    soothing: { voice: 'en-US-AriaNeural', style: 'gentle', rate: 0.85 },
  },
};

// Enhanced voice configurations for different emotions (browser fallback)
const emotionalVoiceConfig = {
  neutral: { rate: 0.9, pitch: 1.0 },
  cheerful: { rate: 1.0, pitch: 1.1 },
  calm: { rate: 0.8, pitch: 0.95 },
  professional: { rate: 0.9, pitch: 1.0 },
  excited: { rate: 1.1, pitch: 1.15 },
  empathetic: { rate: 0.85, pitch: 0.98 },
  friendly: { rate: 1.0, pitch: 1.05 },
  confident: { rate: 0.95, pitch: 1.0 },
  soothing: { rate: 0.8, pitch: 0.92 },
};

/**
 * Check if text-to-speech is supported in the current browser
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window;
};

/**
 * Check which premium TTS services are available (based on API keys)
 */
export const getAvailableServices = () => {
  return {
    browser: isSpeechSynthesisSupported(),
    elevenlabs: !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
    openai: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    azure: !!process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY && !!process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION,
  };
};

/**
 * Auto-select the best available TTS service
 */
export const getBestService = (preferredService?: string): string => {
  const available = getAvailableServices();
  
  if (preferredService && preferredService !== 'auto' && available[preferredService as keyof typeof available]) {
    return preferredService;
  }
  
  // Priority order: ElevenLabs > OpenAI > Azure > Browser
  if (available.elevenlabs) return 'elevenlabs';
  if (available.openai) return 'openai';
  if (available.azure) return 'azure';
  if (available.browser) return 'browser';
  
  return 'browser'; // Fallback
};

/**
 * ElevenLabs TTS implementation
 */
const speakWithElevenLabs = async (text: string, options: SpeechOptions): Promise<void> => {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const emotion = options.emotion || 'professional';
  const voiceConfig = premiumVoiceConfig.elevenlabs[emotion] || premiumVoiceConfig.elevenlabs.neutral;
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voice_id}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: cleanTextForSpeech(text),
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.stability || voiceConfig.stability,
        similarity_boost: options.similarity_boost || voiceConfig.similarity_boost,
        style: 0.5,
        use_speaker_boost: options.use_speaker_boost || true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio playback failed'));
    };
    audio.volume = options.volume || 0.8;
    audio.play().catch(reject);
  });
};

/**
 * OpenAI TTS implementation
 */
const speakWithOpenAI = async (text: string, options: SpeechOptions): Promise<void> => {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const emotion = options.emotion || 'professional';
  const voiceConfig = premiumVoiceConfig.openai[emotion] || premiumVoiceConfig.openai.neutral;
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd', // Use HD model for better quality
      input: cleanTextForSpeech(text),
      voice: voiceConfig.voice,
      speed: voiceConfig.speed,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio playback failed'));
    };
    audio.volume = options.volume || 0.8;
    audio.play().catch(reject);
  });
};

/**
 * Azure Cognitive Services TTS implementation
 */
const speakWithAzure = async (text: string, options: SpeechOptions): Promise<void> => {
  const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;
  
  if (!speechKey || !speechRegion) {
    throw new Error('Azure Speech API configuration missing');
  }

  const emotion = options.emotion || 'professional';
  const voiceConfig = premiumVoiceConfig.azure[emotion] || premiumVoiceConfig.azure.neutral;
  
  // Get access token
  const tokenResponse = await fetch(`https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!tokenResponse.ok) {
    throw new Error(`Azure token error: ${tokenResponse.statusText}`);
  }

  const accessToken = await tokenResponse.text();
  
  // Create SSML with emotional styling
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
           xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
      <voice name="${voiceConfig.voice}">
        <mstts:express-as style="${voiceConfig.style}" styledegree="2">
          <prosody rate="${voiceConfig.rate}">
            ${cleanTextForSpeech(text)}
          </prosody>
        </mstts:express-as>
      </voice>
    </speak>
  `;

  // Synthesize speech
  const speechResponse = await fetch(`https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      'User-Agent': 'YourAppName',
    },
    body: ssml,
  });

  if (!speechResponse.ok) {
    throw new Error(`Azure speech synthesis error: ${speechResponse.statusText}`);
  }

  const audioBlob = await speechResponse.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Audio playback failed'));
    };
    audio.volume = options.volume || 0.8;
    audio.play().catch(reject);
  });
};

/**
 * Get available voices for text-to-speech
 */
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
};

/**
 * Get the best available voice for the specified language and emotion
 */
export const getBestVoice = (language: string = 'en', emotion: string = 'professional'): SpeechSynthesisVoice | null => {
  if (!isSpeechSynthesisSupported()) return null;
  
  const voices = getAvailableVoices();
  
  // Prioritize high-quality voices based on common patterns
  const qualityVoices = voices.filter((voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    
    // Prefer voices that match language
    if (!lang.startsWith(language.toLowerCase())) return false;
    
    // Prioritize premium/neural voices
    return name.includes('neural') || 
           name.includes('premium') || 
           name.includes('enhanced') ||
           name.includes('natural') ||
           name.includes('wavenet') ||
           voice.name.includes('Microsoft') ||
           voice.name.includes('Google');
  });
  
  // If we have quality voices, pick the best one for the emotion
  if (qualityVoices.length > 0) {
    // Try to match emotion to voice characteristics
    const emotionVoiceMap = {
      cheerful: ['zira', 'aria', 'jenny', 'nova'],
      calm: ['david', 'mark', 'ryan', 'brian'],
      professional: ['helena', 'catherine', 'james', 'guy'],
      empathetic: ['aria', 'jenny', 'michelle', 'emma'],
      excited: ['jenny', 'aria', 'nova', 'guy'],
      neutral: ['david', 'mark', 'helena', 'catherine']
    };
    
    const preferredNames = emotionVoiceMap[emotion as keyof typeof emotionVoiceMap] || [];
    
    for (const preferred of preferredNames) {
      const match = qualityVoices.find((voice: SpeechSynthesisVoice) => 
        voice.name.toLowerCase().includes(preferred)
      );
      if (match) return match;
    }
    
    return qualityVoices[0];
  }
  
  // Fallback to any voice in the target language
  const langVoices = voices.filter((voice: SpeechSynthesisVoice) => 
    voice.lang.toLowerCase().startsWith(language.toLowerCase())
  );
  
  return langVoices.length > 0 ? langVoices[0] : voices[0] || null;
};

/**
 * Enhanced speak function with emotional voice support and premium services
 */
export const speakWithEmotion = async (
  text: string,
  emotion: string = 'professional',
  options: SpeechOptions = {}
): Promise<void> => {
  const enhancedOptions: SpeechOptions = {
    ...defaultSpeechOptions,
    ...options,
    emotion: emotion as SpeechOptions['emotion'],
  };

  // Auto-select best service if not specified
  const service = getBestService(enhancedOptions.service);
  enhancedOptions.service = service as SpeechOptions['service'];

  return speakText(text, enhancedOptions);
};

/**
 * Main speak function that routes to appropriate service
 */
export const speakText = async (
  text: string, 
  options: SpeechOptions = {}
): Promise<void> => {
  if (!text.trim()) {
    throw new Error('No text provided to speak.');
  }

  // Stop any ongoing speech
  stopSpeech();

  // Merge options with defaults
  const config = { ...defaultSpeechOptions, ...options };
  const service = getBestService(config.service);

  try {
    switch (service) {
      case 'elevenlabs':
        await speakWithElevenLabs(text, config);
        break;
      case 'openai':
        await speakWithOpenAI(text, config);
        break;
      case 'azure':
        await speakWithAzure(text, config);
        break;
      case 'browser':
      default:
        await speakWithBrowser(text, config);
        break;
    }
  } catch (error) {
    console.warn(`TTS service ${service} failed, falling back to browser:`, error);
    // Fallback to browser TTS if premium service fails
    if (service !== 'browser') {
      await speakWithBrowser(text, config);
    } else {
      throw error;
    }
  }
};

/**
 * Browser TTS implementation (fallback)
 */
const speakWithBrowser = (
  text: string, 
  options: SpeechOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error('Text-to-speech is not supported in your browser.'));
      return;
    }

    // Apply emotional voice settings
    const emotion = options.emotion || 'neutral';
    const emotionConfig = emotionalVoiceConfig[emotion] || emotionalVoiceConfig.neutral;
    
    const config = { 
      ...defaultSpeechOptions, 
      ...emotionConfig,
      ...options 
    };

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
    utterance.rate = config.rate!;
    utterance.pitch = config.pitch!;
    utterance.volume = config.volume!;

    // Set voice - get the best voice for the emotion
    const bestVoice = getBestVoice('en', emotion);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Event handlers
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

    // Speak the text
    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Stop any currently playing speech (works for all services)
 */
export const stopSpeech = (): void => {
  // Stop browser TTS
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
  
  // Stop any HTML audio elements (premium services)
  const audioElements = document.querySelectorAll('audio');
  audioElements.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
};

/**
 * React hook for enhanced text-to-speech functionality
 */
export const useSpeech = () => {
  const speak = async (text: string, options?: SpeechOptions) => {
    try {
      await speakText(text, options);
    } catch (error) {
      console.error('Speech error:', error);
      // You could show a toast notification here
    }
  };

  const speakWithEmotion = async (text: string, emotion: SpeechOptions['emotion'] = 'professional', options?: SpeechOptions) => {
    try {
      await speakText(text, { ...options, emotion });
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const stop = () => {
    stopSpeech();
  };

  const isSupported = isSpeechSynthesisSupported();
  const availableServices = getAvailableServices();

  return { 
    speak, 
    speakWithEmotion, 
    stop, 
    isSupported, 
    availableServices,
    getBestService: () => getBestService(),
  };
};

/**
 * Clean text for better speech synthesis
 * Removes markdown, code blocks, and other formatting
 */
export const cleanTextForSpeech = (text: string): string => {
  return text
    // Remove markdown formatting
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Convert common symbols to words for better pronunciation
    .replace(/&/g, ' and ')
    .replace(/%/g, ' percent')
    .replace(/\$/g, ' dollars')
    .replace(/€/g, ' euros')
    .replace(/£/g, ' pounds')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Get service status and capabilities
 */
export const getServiceStatus = () => {
  const services = getAvailableServices();
  const bestService = getBestService();
  
  return {
    services,
    bestService,
    capabilities: {
      emotions: Object.keys(premiumVoiceConfig.elevenlabs),
      qualityLevel: bestService === 'elevenlabs' ? 'premium' : 
                   bestService === 'openai' ? 'high' :
                   bestService === 'azure' ? 'high' : 'standard',
    },
  };
};
