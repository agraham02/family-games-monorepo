"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NameEntryModalProps {
    open: boolean;
    onSubmit: (name: string) => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    submitLabel?: string;
    cancelLabel?: string;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
}

/**
 * Modal dialog for entering a player name.
 * Used when rejoining a game via direct URL access.
 * Replaces window.prompt() for better UX and accessibility.
 */
export function NameEntryModal({
    open,
    onSubmit,
    onCancel,
    title = "Enter Your Name",
    description = "Please enter your name to rejoin the game.",
    submitLabel = "Join Game",
    cancelLabel = "Cancel",
    placeholder = "Your name",
    minLength = 1,
    maxLength = 20,
}: NameEntryModalProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setName("");
            setError(null);
        }
    }, [open]);

    const validateName = useCallback(
        (value: string): string | null => {
            const trimmed = value.trim();
            if (trimmed.length < minLength) {
                return `Name must be at least ${minLength} character${
                    minLength > 1 ? "s" : ""
                }`;
            }
            if (trimmed.length > maxLength) {
                return `Name must be at most ${maxLength} characters`;
            }
            return null;
        },
        [minLength, maxLength]
    );

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validationError = validateName(name);
        if (validationError) {
            setError(validationError);
            return;
        }
        onSubmit(name.trim());
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setName(e.target.value);
        if (error) {
            setError(null);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape") {
            onCancel();
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent
                showCloseButton={false}
                onKeyDown={handleKeyDown}
                className="sm:max-w-md"
            >
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name-input">Name</Label>
                            <Input
                                id="name-input"
                                type="text"
                                value={name}
                                onChange={handleChange}
                                placeholder={placeholder}
                                maxLength={maxLength}
                                autoFocus
                                autoComplete="off"
                                aria-describedby={
                                    error ? "name-error" : undefined
                                }
                                aria-invalid={!!error}
                            />
                            {error && (
                                <p
                                    id="name-error"
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </Button>
                        <Button type="submit" disabled={!name.trim()}>
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
