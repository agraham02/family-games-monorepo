import Link from "next/link";
import { readdir } from "fs/promises";
import { join } from "path";

async function getDebugRoutes() {
    const debugPath = join(process.cwd(), "src/app/debug");
    const entries = await readdir(debugPath, { withFileTypes: true });

    return entries
        .filter((entry) => entry.isDirectory())
        .map((dir) => ({
            name: dir.name,
            path: `/debug/${dir.name}`,
            label: dir.name
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
        }));
}

export default async function DebugPage() {
    const routes = await getDebugRoutes();

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors">
            <div className="w-full max-w-md p-8">
                <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-zinc-100">
                    Debug Routes
                </h1>
                <div className="flex flex-col gap-4">
                    {routes.map((route) => (
                        <Link
                            key={route.path}
                            href={route.path}
                            className="block px-6 py-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {route.label}
                            </h2>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
