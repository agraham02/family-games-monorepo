// src/lib/audio.ts
// Audio service for game sounds using Web Audio API

/**
 * Singleton AudioContext for the app.
 * Lazily initialized to comply with browser autoplay policies.
 */
let audioContext: AudioContext | null = null;

/**
 * Whether user interaction has occurred to enable audio.
 * Browsers require user interaction before playing audio.
 */
let userInteractionOccurred = false;

/**
 * Sound settings stored in localStorage
 */
const SOUND_SETTINGS_KEY = "game-sound-settings";

interface SoundSettings {
    enabled: boolean;
    volume: number; // 0-1
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
    enabled: true,
    volume: 0.2,
};

/**
 * Get the AudioContext, creating it if needed.
 * Returns null if audio is not available.
 */
function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") {
        return null;
    }

    if (!audioContext) {
        try {
            const AudioContextClass =
                window.AudioContext ||
                (
                    window as typeof window & {
                        webkitAudioContext?: typeof AudioContext;
                    }
                ).webkitAudioContext;
            if (AudioContextClass) {
                audioContext = new AudioContextClass();
            }
        } catch (e) {
            console.debug("Failed to create AudioContext:", e);
            return null;
        }
    }

    return audioContext;
}

/**
 * Resume the AudioContext if it's suspended.
 * Should be called after user interaction.
 */
async function resumeAudioContext(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
        try {
            await ctx.resume();
        } catch (e) {
            console.debug("Failed to resume AudioContext:", e);
        }
    }
}

/**
 * Set up event listeners to enable audio after user interaction.
 * This should be called once when the app loads.
 */
export function initializeAudioOnInteraction(): void {
    if (typeof window === "undefined" || userInteractionOccurred) {
        return;
    }

    const handleInteraction = () => {
        userInteractionOccurred = true;
        resumeAudioContext();
        // Remove listeners after first interaction
        window.removeEventListener("click", handleInteraction);
        window.removeEventListener("keydown", handleInteraction);
        window.removeEventListener("touchstart", handleInteraction);
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });
}

/**
 * Get sound settings from localStorage.
 */
export function getSoundSettings(): SoundSettings {
    if (typeof window === "undefined") {
        return DEFAULT_SOUND_SETTINGS;
    }

    try {
        const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.debug("Failed to read sound settings:", e);
    }

    return DEFAULT_SOUND_SETTINGS;
}

/**
 * Save sound settings to localStorage.
 */
export function saveSoundSettings(settings: Partial<SoundSettings>): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const current = getSoundSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
        console.debug("Failed to save sound settings:", e);
    }
}

/**
 * Check if sound is enabled.
 */
export function isSoundEnabled(): boolean {
    return getSoundSettings().enabled;
}

/**
 * Play the timer start sound - a soft two-tone chime.
 * Uses Web Audio API oscillators for a pleasant, non-jarring sound.
 *
 * @param volumeOverride - Optional volume override (0-1), defaults to saved setting
 */
export function playTimerStartSound(volumeOverride?: number): void {
    const settings = getSoundSettings();

    // Don't play if sound is disabled
    if (!settings.enabled) {
        return;
    }

    const ctx = getAudioContext();
    if (!ctx) {
        return;
    }

    // Don't play if context is suspended (no user interaction yet)
    if (ctx.state === "suspended") {
        return;
    }

    try {
        const volume = volumeOverride ?? settings.volume;
        const now = ctx.currentTime;

        // Create oscillators for a pleasant two-tone chime
        // First tone: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.type = "sine";

        // Envelope for first tone
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc1.start(now);
        osc1.stop(now + 0.15);

        // Second tone: E5 (659.25 Hz) - starts slightly after
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(659.25, now + 0.08);
        osc2.type = "sine";

        // Envelope for second tone
        gain2.gain.setValueAtTime(0, now + 0.08);
        gain2.gain.linearRampToValueAtTime(volume * 0.8, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc2.start(now + 0.08);
        osc2.stop(now + 0.25);
    } catch (e) {
        // Silently fail - audio is not critical
        console.debug("Failed to play timer start sound:", e);
    }
}

/**
 * Play a soft tick sound (for countdown, if needed in future).
 */
export function playTickSound(volumeOverride?: number): void {
    const settings = getSoundSettings();

    if (!settings.enabled) {
        return;
    }

    const ctx = getAudioContext();
    if (!ctx || ctx.state === "suspended") {
        return;
    }

    try {
        const volume = (volumeOverride ?? settings.volume) * 0.3; // Much quieter than main sounds
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(800, now);
        osc.type = "sine";

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    } catch (e) {
        console.debug("Failed to play tick sound:", e);
    }
}
