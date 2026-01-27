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

// ============================================================================
// LRC Game Sounds
// ============================================================================

/**
 * Play dice rolling sound - a rattling noise simulation.
 * Uses multiple oscillators with frequency sweeps to simulate dice shaking.
 */
export function playDiceRollSound(volumeOverride?: number): void {
    const settings = getSoundSettings();

    if (!settings.enabled) {
        return;
    }

    const ctx = getAudioContext();
    if (!ctx || ctx.state === "suspended") {
        return;
    }

    try {
        const volume = volumeOverride ?? settings.volume;
        const now = ctx.currentTime;

        // Create multiple short bursts to simulate dice rattling
        for (let i = 0; i < 8; i++) {
            const startTime = now + i * 0.08;

            // White noise-like effect using multiple oscillators
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Random-ish frequency for each rattle
            const baseFreq = 200 + Math.random() * 400;
            osc.frequency.setValueAtTime(baseFreq, startTime);
            osc.frequency.linearRampToValueAtTime(
                baseFreq * 0.5,
                startTime + 0.06,
            );
            osc.type = "triangle";

            // Quick attack, quick decay
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

            osc.start(startTime);
            osc.stop(startTime + 0.07);
        }

        // Final "landing" thud
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.connect(thudGain);
        thudGain.connect(ctx.destination);

        const thudTime = now + 0.7;
        thud.frequency.setValueAtTime(100, thudTime);
        thud.frequency.exponentialRampToValueAtTime(50, thudTime + 0.1);
        thud.type = "sine";

        thudGain.gain.setValueAtTime(0, thudTime);
        thudGain.gain.linearRampToValueAtTime(volume * 0.5, thudTime + 0.02);
        thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.15);

        thud.start(thudTime);
        thud.stop(thudTime + 0.15);
    } catch (e) {
        console.debug("Failed to play dice roll sound:", e);
    }
}

/**
 * Play chip passing sound - a short metallic clink.
 * Simulates poker chips being passed.
 */
export function playChipPassSound(volumeOverride?: number): void {
    const settings = getSoundSettings();

    if (!settings.enabled) {
        return;
    }

    const ctx = getAudioContext();
    if (!ctx || ctx.state === "suspended") {
        return;
    }

    try {
        const volume = volumeOverride ?? settings.volume;
        const now = ctx.currentTime;

        // High-frequency metallic ping
        const ping = ctx.createOscillator();
        const pingGain = ctx.createGain();
        ping.connect(pingGain);
        pingGain.connect(ctx.destination);

        ping.frequency.setValueAtTime(2500, now);
        ping.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
        ping.type = "sine";

        pingGain.gain.setValueAtTime(0, now);
        pingGain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.005);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        ping.start(now);
        ping.stop(now + 0.1);

        // Secondary lower harmonic
        const harm = ctx.createOscillator();
        const harmGain = ctx.createGain();
        harm.connect(harmGain);
        harmGain.connect(ctx.destination);

        harm.frequency.setValueAtTime(1200, now + 0.01);
        harm.type = "sine";

        harmGain.gain.setValueAtTime(0, now + 0.01);
        harmGain.gain.linearRampToValueAtTime(volume * 0.2, now + 0.02);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        harm.start(now + 0.01);
        harm.stop(now + 0.12);
    } catch (e) {
        console.debug("Failed to play chip pass sound:", e);
    }
}

/**
 * Play winner fanfare sound - an ascending triumphant chord.
 * Celebrates the round winner.
 */
export function playWinnerFanfareSound(volumeOverride?: number): void {
    const settings = getSoundSettings();

    if (!settings.enabled) {
        return;
    }

    const ctx = getAudioContext();
    if (!ctx || ctx.state === "suspended") {
        return;
    }

    try {
        const volume = volumeOverride ?? settings.volume;
        const now = ctx.currentTime;

        // Major chord arpeggio: C4 -> E4 -> G4 -> C5
        const notes = [261.63, 329.63, 392.0, 523.25];

        notes.forEach((freq, i) => {
            const startTime = now + i * 0.1;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(freq, startTime);
            osc.type = "sine";

            // Gradual fade in, longer sustain
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.05);
            gain.gain.setValueAtTime(volume * 0.5, startTime + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });

        // Final sustained chord
        const chordTime = now + 0.5;
        const chordFreqs = [523.25, 659.25, 783.99]; // C5, E5, G5

        chordFreqs.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(freq, chordTime);
            osc.type = "sine";

            gain.gain.setValueAtTime(0, chordTime);
            gain.gain.linearRampToValueAtTime(volume * 0.4, chordTime + 0.05);
            gain.gain.setValueAtTime(volume * 0.4, chordTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.8);

            osc.start(chordTime);
            osc.stop(chordTime + 0.8);
        });
    } catch (e) {
        console.debug("Failed to play winner fanfare sound:", e);
    }
}
