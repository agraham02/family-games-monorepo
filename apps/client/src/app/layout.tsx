import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HealthCheckGate from "@/components/HealthCheckGate";
import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const viewport: Viewport = {
    themeColor: "#0f172a",
};

export const metadata: Metadata = {
    title: "Family Game Room",
    description: "A place for family games and fun!",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Family Game Room",
    },
    icons: {
        icon: [
            { rel: "icon", url: "/family-gameroom-icon.png", sizes: "795x795" },
        ],
        shortcut: [
            {
                rel: "shortcut icon",
                url: "/family-gameroom-icon.png",
                sizes: "795x795",
            },
        ],
        apple: [{ url: "/family-gameroom-icon.png", sizes: "795x795" }],
    },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AddToHomeScreenPrompt />
                <HealthCheckGate>{children}</HealthCheckGate>
            </body>
        </html>
    );
}
