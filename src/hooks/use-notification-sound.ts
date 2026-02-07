/**
 * Hook for playing notification sounds in the browser
 * Used for real-time cart activity alerts
 */

import { useCallback, useEffect, useRef } from "react";

// Notification sound URLs - using free notification sounds
const NOTIFICATION_SOUNDS = {
  // Simple bell/chime sound (base64 encoded short beep)
  default: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleDoLTprZ3K5mIwhTqenqsGcnDE2l4eaqXBwEPZHO1aJcGQA6l9fgrV4XADSO0NijWRQALYjO0J5VEAAohs7QnFIQACaDzM2YTRAAL4HHyI9GAC16wbyJPwAsdb25gjoAKHO4tnw2ACdyt7R5MwAncbWycTAAJ3G0sG4uACdws65rLAAnb7GsaSoAJm6wqmYnACVtrqhjJQAkbKygYCMAI2qrnV0hACJpqZpaHwAhZ6eXVx0AIGallFQbAB9ko5FRGQAeYqGOThcAHWCfikwVABxef4hJEwAbXH2GRhEAGlt7hEMPABlZeYJADQAYV3eAPQsAF1V1fjsJABZTc3w4BwAVUXF6NgUAFFBveDMDABNObXYxAQASS2tzLwAAEUppcS0AABBIZm8rAAAOR2RtKQAADUVibCcAAAxDYGokAAALQV5oIgAACj9cZiAAAAk9WmQeAAAIPVhjHAAACDxWYRoAAAc7VF8YAAAGOVJdFgAABjhQWxQAAAU2TlkSAAAFNU1XEAAABDNLVg4AAAQ",
  // Cart/shopping notification
  cart: "data:audio/wav;base64,UklGRl9FAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhO0UAAHh4eHh3d3d3dnZ2dnV1dXV0dHR0c3NzcnJycnFxcXFwcHBwb29vb25ubm5tbW1tbGxsbGtra2tqampqaWlpaWhoaGhnZ2dnZmZmZmVlZWVkZGRkY2NjY2JiYmJhYWFhYGBgYF9fX19eXl5eXV1dXVxcXFxbW1tbWlpaWllZWVlYWFhYV1dXV1ZWVlZVVVVVVFRUVFNTU1NSUlJSUVFRUVBQUFBPT09PTk5OTk1NTU1MTExMS0tLS0pKSkpJSUlJSEhISEdHR0dGRkZGRUVFRURERERDQ0NDQkJCQkFBQUFAQEBAPz8/Pz4+Pj49PT09PDw8PDs7Ozs6Ojo6OTk5OTg4ODg3Nzc3NjY2NjU1NTU0NDQ0MzMzMzIyMjIxMTExMDAwMC8vLy8uLi4uLS0tLSwsLCwrKysrKioqKikpKSkoKCgoJycnJyYmJiYlJSUlJCQkJCMjIyMiIiIiISEhISAgICAf",
  // Success sound
  success: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleDoLTprZ3K5mIwhTqenqsGcnDE2l4eaqXBwEPZHO1aJcGQA6l9fgrV4XADSO0NijWRQALYjO0J5VEAAohs7QnFIQACaDzM2YTRAAL4HHyI9GAC16wbyJPwAsdb25gjoAKHO4tnw2ACdyt7R5MwAncbWycTAAJ3G0sG4uACdws65rLAAnb7GsaSoAJm6wqmYnACVtrqhjJQAkbKygYCMAI2qrnV0hACJpqZpaHwAhZ6eXVx0AIGallFQbAB9ko5FRGQAeYqGOThcAHWCfikwVABxef4hJEwAbXH2GRhEAGlt7hEMPABlZeYJADQAYV3eAPQsAF1V1fjsJABZTc3w4BwAVUXF6NgUAFFBveDMDABNObXYxAQASS2tzLwAAEUppcS0AABBIZm8rAAAOR2RtKQAADUVibCcAAAxDYGokAAALQV5oIgAACj9cZiAAAAk9WmQeAAAIPVhjHAAACDxWYRoAAAc7VF8YAAAGOVJdFgAABjhQWxQAAAU2TlkSAAAFNU1XEAAABDNLVg4AAAQ",
} as const;

type SoundType = keyof typeof NOTIFICATION_SOUNDS;

interface UseNotificationSoundOptions {
  /** Volume level from 0 to 1 */
  volume?: number;
  /** Whether to enable sounds by default */
  enabled?: boolean;
  /** Sound type to use */
  soundType?: SoundType;
}

interface UseNotificationSoundReturn {
  /** Play the notification sound */
  play: () => void;
  /** Play a specific sound type */
  playSound: (type: SoundType) => void;
  /** Whether sounds are enabled */
  isEnabled: boolean;
  /** Enable/disable sounds */
  setEnabled: (enabled: boolean) => void;
  /** Toggle sounds on/off */
  toggle: () => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
}

/**
 * Hook for playing browser notification sounds
 * Stores preference in localStorage
 */
export function useNotificationSound(
  options: UseNotificationSoundOptions = {}
): UseNotificationSoundReturn {
  const {
    volume: initialVolume = 0.5,
    enabled: initialEnabled = true,
    soundType = "default",
  } = options;

  // Use refs to avoid re-renders
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(initialVolume);
  const enabledRef = useRef(initialEnabled);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEnabled = localStorage.getItem("notification-sound-enabled");
    const storedVolume = localStorage.getItem("notification-sound-volume");

    if (storedEnabled !== null) {
      enabledRef.current = storedEnabled === "true";
    }
    if (storedVolume !== null) {
      volumeRef.current = parseFloat(storedVolume);
    }
  }, []);

  // Create or get audio element
  const getAudio = useCallback((type: SoundType = soundType) => {
    if (typeof window === "undefined") return null;

    // Create new audio element with the sound
    const audio = new Audio(NOTIFICATION_SOUNDS[type]);
    audio.volume = volumeRef.current;
    return audio;
  }, [soundType]);

  // Play a specific sound
  const playSound = useCallback(
    (type: SoundType) => {
      if (!enabledRef.current) return;
      if (typeof window === "undefined") return;

      try {
        const audio = getAudio(type);
        if (audio) {
          // Reset to start if already playing
          audio.currentTime = 0;
          audio.play().catch((error) => {
            // Browser may block autoplay - user interaction required
            console.warn("Could not play notification sound:", error);
          });
        }
      } catch (error) {
        console.warn("Error playing notification sound:", error);
      }
    },
    [getAudio]
  );

  // Play default sound
  const play = useCallback(() => {
    playSound(soundType);
  }, [playSound, soundType]);

  // Set enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("notification-sound-enabled", String(enabled));
    }
  }, []);

  // Toggle enabled state
  const toggle = useCallback(() => {
    setEnabled(!enabledRef.current);
  }, [setEnabled]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    volumeRef.current = clampedVolume;
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("notification-sound-volume", String(clampedVolume));
    }
  }, []);

  return {
    play,
    playSound,
    isEnabled: enabledRef.current,
    setEnabled,
    toggle,
    setVolume,
  };
}

/**
 * Hook to detect new activity and play notification sound
 * Compares timestamps to detect new items
 */
export function useActivityNotification(
  latestTimestamp: number | null | undefined,
  options: UseNotificationSoundOptions & {
    /** Callback when new activity is detected */
    onNewActivity?: () => void;
  } = {}
) {
  const { onNewActivity, ...soundOptions } = options;
  const { play } = useNotificationSound(soundOptions);
  const lastTimestampRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Skip if no timestamp
    if (latestTimestamp == null) return;

    // On first load, just store the timestamp without playing sound
    if (!initializedRef.current) {
      lastTimestampRef.current = latestTimestamp;
      initializedRef.current = true;
      return;
    }

    // Check if this is a new activity
    if (lastTimestampRef.current !== null && latestTimestamp > lastTimestampRef.current) {
      play();
      onNewActivity?.();
    }

    // Update stored timestamp
    lastTimestampRef.current = latestTimestamp;
  }, [latestTimestamp, play, onNewActivity]);

  return {
    lastActivityAt: lastTimestampRef.current,
  };
}
