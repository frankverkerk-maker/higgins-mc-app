/**
 * Text-to-Speech Service using Eleven Labs
 * 
 * Provides voice synthesis for Higgins MC agents.
 * Each agent has a unique voice profile configured in voice-profiles.ts.
 */

import { ENV } from "./_core/env";
import { getVoiceProfile, getElevenLabsTTSUrl } from "./voice-profiles";

interface TTSOptions {
  agentName: string;
  text: string;
  outputFormat?: "mp3_44100_128" | "mp3_22050_32" | "pcm_16000" | "pcm_22050";
}

interface TTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  contentType?: string;
  error?: string;
}

/**
 * Generate speech audio from text using an agent's voice profile.
 * Returns a Buffer containing the audio data.
 */
export async function generateSpeech(options: TTSOptions): Promise<TTSResult> {
  const { agentName, text, outputFormat = "mp3_44100_128" } = options;

  if (!ENV.elevenLabsApiKey) {
    return { success: false, error: "ELEVENLABS_API_KEY not configured" };
  }

  if (!text || text.trim().length === 0) {
    return { success: false, error: "No text provided" };
  }

  const profile = getVoiceProfile(agentName);
  const url = getElevenLabsTTSUrl(agentName);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ENV.elevenLabsApiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000), // Eleven Labs max ~5000 chars per request
        model_id: "eleven_multilingual_v2",
        voice_settings: profile.settings,
        output_format: outputFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Eleven Labs API error ${response.status}: ${errorText}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      audioBuffer,
      contentType: "audio/mpeg",
    };
  } catch (error) {
    return {
      success: false,
      error: `TTS request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check if TTS is available (API key configured).
 */
export function isTTSAvailable(): boolean {
  return !!ENV.elevenLabsApiKey;
}
