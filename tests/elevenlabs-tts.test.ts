import { describe, it, expect } from "vitest";

describe("ELEVENLABS_API_KEY TTS validation", () => {
  it("should be set in environment", () => {
    const key = process.env.ELEVENLABS_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should successfully generate speech via TTS endpoint", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY not set");

    // Use Rachel voice (default) with minimal text to save quota
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "Test",
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("audio");
  });
});
