"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import {
    getSoundSettings,
    saveSoundSettings,
    playTimerStartSound,
} from "@/lib/audio";

export function SoundToggle() {
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        // Load saved setting
        const settings = getSoundSettings();
        setSoundEnabled(settings.enabled);
    }, []);

    function toggleSound() {
        const newEnabled = !soundEnabled;
        setSoundEnabled(newEnabled);
        saveSoundSettings({ enabled: newEnabled });

        // Play a preview sound when enabling
        if (newEnabled) {
            // Small delay to ensure the setting is saved
            setTimeout(() => {
                playTimerStartSound();
            }, 50);
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            onClick={toggleSound}
            className="rounded-full border border-zinc-200 dark:border-zinc-700"
        >
            {soundEnabled ? (
                <Volume2 className="h-5 w-5" />
            ) : (
                <VolumeX className="h-5 w-5" />
            )}
        </Button>
    );
}
