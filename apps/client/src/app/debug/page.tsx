import Link from "next/link";

const DEBUG_ROUTES = [
    {
        href: "/debug/game-ui",
        label: "Game UI",
        description:
            "Interactive game UI debugger with mock state — supports Spades, Rummy, Dominoes, and LRC",
    },
    {
        href: "/debug/meld-board",
        label: "Meld Board",
        description: "Visual test for the shared meld board component",
    },
    {
        href: "/debug/seat-layout",
        label: "Seat Layout",
        description:
            "Verify clockwise seat placement and edge stacking for 2–6 players",
    },
];

export default function DebugIndexPage() {
    return (
        <main className="min-h-screen bg-gray-950 text-gray-100 p-10">
            <h1 className="text-3xl font-bold mb-2">Debug Routes</h1>
            <p className="text-gray-400 mb-8 text-sm">
                Development-only pages for visual and functional testing.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DEBUG_ROUTES.map(({ href, label, description }) => (
                    <li key={href}>
                        <Link
                            href={href}
                            className="block rounded-xl border border-gray-700 bg-gray-900 p-5 hover:border-indigo-500 hover:bg-gray-800 transition-colors"
                        >
                            <span className="block font-semibold text-indigo-400 mb-1">
                                {label}
                            </span>
                            <span className="block text-sm text-gray-400">
                                {description}
                            </span>
                            <span className="block mt-3 text-xs text-gray-600 font-mono truncate">
                                {href}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}
