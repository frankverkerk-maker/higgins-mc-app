/**
 * Voice Profiles for Higgins Mission Control Agents
 * 
 * Each agent has a configured Eleven Labs voice for text-to-speech output.
 * These profiles are used when agents respond via voice (phone calls, voice messages).
 * 
 * To configure:
 * 1. Go to https://elevenlabs.io/voice-library
 * 2. Select or clone a voice that matches the agent's character
 * 3. Copy the voice_id and update below
 * 
 * Voice IDs below use Eleven Labs preset voices as defaults.
 * Replace with custom cloned voice IDs for production.
 */

export interface VoiceProfile {
  agentName: string;
  voiceId: string;
  voiceName: string;
  description: string;
  settings: {
    stability: number;       // 0.0 - 1.0 (higher = more consistent)
    similarity_boost: number; // 0.0 - 1.0 (higher = closer to original)
    style: number;           // 0.0 - 1.0 (higher = more expressive)
    use_speaker_boost: boolean;
  };
  language: string;
}

/**
 * Agent voice profiles mapped by agent name.
 * 
 * Eleven Labs recommended voices:
 * - Rachel (21m00Tcm4TlvDq8ikWAM) — Professional female, clear
 * - Drew (29vD33N1CtxCmqQRPOHJ) — Professional male, warm
 * - Clyde (2EiwWnXFnvU5JabPnv8n) — Deep male, authoritative
 * - Bella (EXAVITQu4vr4xnSDxMaL) — Young professional female
 * - Antoni (ErXwobaYiN019PkySvjV) — Professional male, European
 * - Elli (MF3mGyEYCl7XYWbV9V6O) — Young female, clear
 * - Josh (TxGEqnHWrfWFTfGW9XjX) — Deep male, narrative
 * - Arnold (VR6AewLTigWG4xSOukaG) — Deep male, commanding
 * - Sam (yoZ06aMxZJJ28mfd3POQ) — Professional male, neutral
 */
export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // ═══════════════════════════════════════════════════════════
  // EXECUTIVE OFFICE
  // ═══════════════════════════════════════════════════════════
  
  Higgins: {
    agentName: "Higgins",
    voiceId: "2EiwWnXFnvU5JabPnv8n", // Clyde — deep, authoritative
    voiceName: "Clyde",
    description: "Deep, authoritative British butler voice. Calm, measured, commanding respect.",
    settings: {
      stability: 0.75,
      similarity_boost: 0.80,
      style: 0.30,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Nathalie: {
    agentName: "Nathalie",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — professional, warm female
    voiceName: "Rachel",
    description: "Warm, professional European female. Clear articulation, approachable yet authoritative.",
    settings: {
      stability: 0.65,
      similarity_boost: 0.75,
      style: 0.45,
      use_speaker_boost: true,
    },
    language: "nl", // Primary language Dutch, supports DE/EN
  },

  // ═══════════════════════════════════════════════════════════
  // DEPARTMENT HEADS
  // ═══════════════════════════════════════════════════════════

  Warren: {
    agentName: "Warren",
    voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh — deep, narrative
    voiceName: "Josh",
    description: "Calm, analytical male voice. Measured pace, inspires confidence in financial matters.",
    settings: {
      stability: 0.80,
      similarity_boost: 0.70,
      style: 0.20,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Gary: {
    agentName: "Gary",
    voiceId: "ErXwobaYiN019PkySvjV", // Antoni — professional, European male
    voiceName: "Antoni",
    description: "Energetic, creative male voice. Slightly faster pace, enthusiastic about campaigns.",
    settings: {
      stability: 0.55,
      similarity_boost: 0.75,
      style: 0.60,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Elon: {
    agentName: "Elon",
    voiceId: "VR6AewLTigWG4xSOukaG", // Arnold — deep, commanding
    voiceName: "Arnold",
    description: "Direct, no-nonsense male voice. Technical, efficient, slightly intense.",
    settings: {
      stability: 0.70,
      similarity_boost: 0.80,
      style: 0.35,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Justitia: {
    agentName: "Justitia",
    voiceId: "29vD33N1CtxCmqQRPOHJ", // Drew — professional, warm male
    voiceName: "Drew",
    description: "Authoritative, measured legal voice. Precise language, careful articulation.",
    settings: {
      stability: 0.85,
      similarity_boost: 0.75,
      style: 0.15,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Victoria: {
    agentName: "Victoria",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella — young professional female
    voiceName: "Bella",
    description: "Confident, strategic female voice. Clear, persuasive, business-oriented.",
    settings: {
      stability: 0.65,
      similarity_boost: 0.75,
      style: 0.50,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Morgan: {
    agentName: "Morgan",
    voiceId: "yoZ06aMxZJJ28mfd3POQ", // Sam — professional, neutral
    voiceName: "Sam",
    description: "Steady, reliable male voice. Numbers-focused, precise, trustworthy.",
    settings: {
      stability: 0.80,
      similarity_boost: 0.70,
      style: 0.20,
      use_speaker_boost: true,
    },
    language: "en",
  },

  Einstein: {
    agentName: "Einstein",
    voiceId: "29vD33N1CtxCmqQRPOHJ", // Drew — warm, intellectual
    voiceName: "Drew",
    description: "Thoughtful, intellectual male voice. Slower pace, contemplative, wise.",
    settings: {
      stability: 0.75,
      similarity_boost: 0.70,
      style: 0.25,
      use_speaker_boost: true,
    },
    language: "en",
  },
};

/**
 * Get the voice profile for a specific agent.
 * Falls back to Higgins' voice if agent not found.
 */
export function getVoiceProfile(agentName: string): VoiceProfile {
  return VOICE_PROFILES[agentName] ?? VOICE_PROFILES["Higgins"];
}

/**
 * Get Eleven Labs TTS request body for an agent.
 */
export function getElevenLabsRequestBody(agentName: string, text: string) {
  const profile = getVoiceProfile(agentName);
  return {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: profile.settings,
  };
}

/**
 * Get the Eleven Labs API URL for a specific agent's voice.
 */
export function getElevenLabsTTSUrl(agentName: string): string {
  const profile = getVoiceProfile(agentName);
  return `https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}`;
}
