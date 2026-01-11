"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        console.error("ErrorBoundary caught an error:", error, errorInfo);

        // TODO: Send to error reporting service in production
        // e.g., Sentry, LogRocket, etc.
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            <AlertTriangle className="h-12 w-12 text-amber-500" />
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Something went wrong
                            </h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                                An unexpected error occurred. Please try again
                                or return to the home page.
                            </p>
                        </div>

                        {/* Error details (development only) */}
                        {process.env.NODE_ENV === "development" &&
                            this.state.error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}

                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={this.handleReset}
                                className="w-full"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                            <Button
                                variant="outline"
                                onClick={this.handleGoHome}
                                className="w-full"
                            >
                                <Home className="h-4 w-4 mr-2" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Game-specific error boundary with game-focused messaging
 */
export class GameErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("GameErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    handleReturnToLobby = () => {
        // Try to get room code from URL
        const pathParts = window.location.pathname.split("/");
        const roomCode = pathParts[pathParts.length - 1];
        if (roomCode) {
            window.location.href = `/lobby/${roomCode}`;
        } else {
            window.location.href = "/";
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            <AlertTriangle className="h-12 w-12 text-red-500" />
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Game Error
                            </h1>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                                The game encountered an error. You can try to
                                reload or return to the lobby.
                            </p>
                        </div>

                        {process.env.NODE_ENV === "development" &&
                            this.state.error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}

                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={this.handleReset}
                                className="w-full"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reload Game
                            </Button>
                            <Button
                                variant="outline"
                                onClick={this.handleReturnToLobby}
                                className="w-full"
                            >
                                Return to Lobby
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
