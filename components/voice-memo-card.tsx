/**
 * VoiceMemoCard — Audio bubble for voice memo messages in Chat.
 * Shows a play/pause button, waveform animation, duration, and transcript toggle.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { VoiceWaveform } from "./voice-waveform";

// Design tokens (match chat.tsx)
const C = {
  bg: "#0A0C0E",
  surface: "#111418",
  surface2: "#161B21",
  border: "#1E2530",
  cyan: "#00D4D4",
  cyanDim: "rgba(0,212,212,0.12)",
  cyanBorder: "rgba(0,212,212,0.25)",
  text: "#E8EDF2",
  muted: "#5A6472",
};
const FONT = Platform.OS === "ios" ? "Avenir" : undefined;
const FONT_BOLD = Platform.OS === "ios" ? "Avenir-Heavy" : undefined;

interface VoiceMemoCardProps {
  audioUri: string;
  duration: number; // seconds
  transcript?: string;
  labels: {
    voiceMemo: string;
    voiceMemoDuration: string;
    voiceMemoTranscript: string;
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMemoCard({ audioUri, duration, transcript, labels }: VoiceMemoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.remove(); } catch (_) {}
        playerRef.current = null;
      }
    };
  }, []);

  const togglePlayback = useCallback(async () => {
    if (isPlaying && playerRef.current) {
      try { playerRef.current.pause(); } catch (_) {}
      setIsPlaying(false);
      return;
    }

    // Stop any existing player
    if (playerRef.current) {
      try { playerRef.current.remove(); } catch (_) {}
      playerRef.current = null;
    }

    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer(audioUri);
      playerRef.current = player;
      setIsPlaying(true);

      player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          try { player.remove(); } catch (_) {}
          playerRef.current = null;
        }
      });

      player.play();
    } catch (_) {
      setIsPlaying(false);
    }
  }, [isPlaying, audioUri]);

  return (
    <View style={styles.container}>
      {/* Play/Pause + Waveform + Duration */}
      <View style={styles.row}>
        <Pressable
          onPress={togglePlayback}
          style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.playIcon}>{isPlaying ? "⏸" : "▶️"}</Text>
        </Pressable>

        <View style={styles.waveArea}>
          {isPlaying ? (
            <VoiceWaveform isPlaying={true} color={C.cyan} height={20} barCount={8} barWidth={3} />
          ) : (
            // Static bars when not playing
            <View style={styles.staticBars}>
              {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.3, 0.6].map((h, i) => (
                <View
                  key={i}
                  style={[styles.staticBar, { height: 20 * h }]}
                />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      </View>

      {/* Label */}
      <Text style={styles.label}>🎤 {labels.voiceMemo}</Text>

      {/* Transcript toggle */}
      {transcript && (
        <Pressable
          onPress={() => setShowTranscript(!showTranscript)}
          style={({ pressed }) => [styles.transcriptToggle, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.transcriptToggleText}>
            {showTranscript ? "▼" : "▶"} {labels.voiceMemoTranscript}
          </Text>
        </Pressable>
      )}
      {showTranscript && transcript && (
        <Text style={styles.transcriptText}>{transcript}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0,212,212,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    padding: 12,
    gap: 8,
    maxWidth: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.cyanDim,
    borderWidth: 1,
    borderColor: C.cyanBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    fontSize: 16,
  },
  waveArea: {
    flex: 1,
    height: 24,
    justifyContent: "center",
  },
  staticBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 20,
  },
  staticBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(0,212,212,0.4)",
  },
  duration: {
    fontSize: 12,
    color: C.muted,
    fontFamily: FONT,
    minWidth: 32,
    textAlign: "right",
  },
  label: {
    fontSize: 11,
    color: C.muted,
    fontFamily: FONT,
  },
  transcriptToggle: {
    paddingVertical: 2,
  },
  transcriptToggleText: {
    fontSize: 12,
    color: C.cyan,
    fontFamily: FONT_BOLD,
  },
  transcriptText: {
    fontSize: 13,
    color: C.text,
    fontFamily: FONT,
    lineHeight: 19,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: C.cyanBorder,
  },
});
