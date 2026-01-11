"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

function getSystemTheme() {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

export function DarkModeToggle() {
    const [theme, setTheme] = useState("light");

    useEffect(() => {
        const saved =
            typeof window !== "undefined"
                ? localStorage.getItem("theme")
                : null;
        const initial = saved || getSystemTheme();
        setTheme(initial);
        document.documentElement.classList.toggle("dark", initial === "dark");
    }, []);

    function toggleTheme() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
        localStorage.setItem("theme", next);
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="rounded-full border border-zinc-200 dark:border-zinc-700"
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </Button>
    );
}
