"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Zap, Ban, Minus, Plus, Users, Clock } from "lucide-react";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BlindWindowTeamState } from "@shared/types";

interface PartnerInfo {
    id: string;
    name: string;
}

/**
 * Modal shown to a player whose team is eligible for blind bidding while the
 * `blind-bid-window` phase is active. The decision is team-wide: either
 * teammate may commit a team blind bid or reveal the team's cards. Blind nil
 * is the only per-player commitment.
 */
export default function BlindBidWindowModal({
    isOpen,
    teamState,
    deadlineMs,
    teamScoreDeficit,
    canBlindBid,
    canBlindNil,
    partner,
    selfId,
    onCommitTeamBlind,
    onCommitBlindNil,
    onRevealHands,
}: {
    isOpen: boolean;
    teamState: BlindWindowTeamState | undefined;
    deadlineMs: number;
    teamScoreDeficit: number;
    canBlindBid: boolean;
    canBlindNil: boolean;
    partner: PartnerInfo | null;
    selfId: string;
    onCommitTeamBlind: (amount: number) => void;
    onCommitBlindNil: () => void;
    onRevealHands: () => void;
}) {
    const [showSelector, setShowSelector] = useState(false);
    const [bidAmount, setBidAmount] = useState(4);
    const [remaining, setRemaining] = useState(() =>
        Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)),
    );

    // Tick the countdown every second.
    useEffect(() => {
        if (!isOpen) return;
        const update = () =>
            setRemaining(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
        update();
        const handle = setInterval(update, 250);
        return () => clearInterval(handle);
    }, [isOpen, deadlineMs]);

    // Reset internal selector state whenever the modal closes/reopens.
    useEffect(() => {
        if (!isOpen) {
            setShowSelector(false);
            setBidAmount(4);
        }
    }, [isOpen]);

    const teamCommitted = teamState?.status === "committed-team-blind";
    const teamRevealed = teamState?.status === "revealed";
    const teamPending = teamState?.status === "pending";
    const iCommittedBlindNil = !!teamState?.blindNilPlayerIds.includes(selfId);
    const partnerCommittedBlindNil =
        partner !== null && !!teamState?.blindNilPlayerIds.includes(partner.id);

    // Once the team's status is non-pending, the player can no longer change
    // the team's collective decision. We keep the modal mounted briefly so the
    // user sees what was decided before it auto-closes from the parent.
    const lockedByTeam = teamCommitted || teamRevealed;

    return (
        <Dialog open={isOpen}>
            <DialogContent
                className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30 text-white p-4 sm:p-6 shadow-2xl"
                showCloseButton={false}
            >
                <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-amber-400 text-center">
                    <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-pulse" />
                    Team Blind-Bid Window
                </DialogTitle>

                <DialogDescription className="sr-only">
                    Your team has the option to bid blind. Either teammate may
                    commit a team-wide blind bid or reveal the cards. Blind nil
                    is an individual commitment.
                </DialogDescription>

                <div className="w-full space-y-4">
                    {/* Deficit context */}
                    <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-center">
                        <p className="text-sm text-red-300 font-medium">
                            Your team is{" "}
                            <span className="text-2xl font-bold text-red-400">
                                {teamScoreDeficit}
                            </span>{" "}
                            points behind
                        </p>
                        <p className="text-xs text-red-200/80 mt-1">
                            Blind commitments earn double points if successful.
                        </p>
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center justify-center gap-2 text-amber-300 text-sm">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono font-bold">
                            {remaining}s
                        </span>
                        <span className="text-white/60">
                            until cards auto-reveal
                        </span>
                    </div>

                    {/* Partner status */}
                    {partner && (
                        <div className="bg-slate-800/60 border border-white/10 rounded-lg p-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-white/70 shrink-0" />
                            <div className="text-xs text-white/80 leading-tight">
                                <span className="font-semibold">{partner.name}</span>
                                {partnerCommittedBlindNil ? (
                                    <span className="text-red-300">
                                        {" "}committed blind nil
                                    </span>
                                ) : teamPending ? (
                                    <span className="text-white/60">
                                        {" "}is also deciding…
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* Locked status banners */}
                    {teamCommitted && (
                        <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-3 text-center text-sm text-amber-200">
                            Team committed a blind bid of{" "}
                            <span className="font-bold text-amber-100">
                                {teamState?.teamBlindBid}
                            </span>{" "}
                            tricks.
                        </div>
                    )}
                    {teamRevealed && (
                        <div className="bg-slate-700/40 border border-white/10 rounded-lg p-3 text-center text-sm text-white/80">
                            Cards revealed. Your team will bid normally.
                        </div>
                    )}
                    {iCommittedBlindNil && (
                        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-center text-sm text-red-200">
                            You committed blind nil.
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {!showSelector ? (
                            <motion.div
                                key="options"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                {/* Team Blind Bid */}
                                {canBlindBid && !lockedByTeam && (
                                    <Button
                                        onClick={() => setShowSelector(true)}
                                        className={cn(
                                            "w-full h-auto py-4 px-5 flex flex-col items-start gap-2",
                                            "bg-linear-to-r from-amber-600 to-orange-600",
                                            "hover:from-amber-700 hover:to-orange-700",
                                            "border-2 border-amber-400/50",
                                            "text-left transition-all",
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Zap className="w-5 h-5" />
                                            <span className="font-bold text-lg">
                                                Commit Team Blind Bid
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/90">
                                            Lock in a 4–13 combined team bid.
                                            Both partners skip individual
                                            bidding.
                                        </p>
                                    </Button>
                                )}

                                {/* Blind Nil (individual) */}
                                {canBlindNil &&
                                    !iCommittedBlindNil &&
                                    !teamCommitted && (
                                        <Button
                                            onClick={onCommitBlindNil}
                                            className={cn(
                                                "w-full h-auto py-4 px-5 flex flex-col items-start gap-2",
                                                "bg-linear-to-r from-red-600 to-red-700",
                                                "hover:from-red-700 hover:to-red-800",
                                                "border-2 border-red-400/50",
                                                "text-left transition-all",
                                            )}
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <Ban className="w-5 h-5" />
                                                <span className="font-bold text-lg">
                                                    Bid Blind Nil (just me)
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/90">
                                                Personal commitment: win zero
                                                tricks sight unseen for ±200.
                                                Partner still bids normally.
                                            </p>
                                        </Button>
                                    )}

                                {/* Reveal */}
                                {!lockedByTeam && (
                                    <Button
                                        onClick={onRevealHands}
                                        variant="outline"
                                        className="w-full h-auto py-3 px-5 flex items-center justify-center gap-2 border-white/30 bg-slate-800/50 hover:bg-slate-700/50 text-white/80 hover:text-white"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>Reveal Our Cards</span>
                                    </Button>
                                )}

                                {lockedByTeam && (
                                    <p className="text-xs text-white/50 text-center">
                                        Waiting for opponents to finish
                                        deciding…
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="selector"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-4 text-center">
                                    <p className="text-sm text-amber-200 mb-2">
                                        How many combined tricks for your team?
                                    </p>
                                    <div className="flex items-center justify-center gap-4">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                setBidAmount((p) =>
                                                    Math.max(4, p - 1),
                                                )
                                            }
                                            disabled={bidAmount <= 4}
                                            className="h-10 w-10 rounded-full border-amber-400/30 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </Button>
                                        <motion.div
                                            key={bidAmount}
                                            initial={{ scale: 1.2 }}
                                            animate={{ scale: 1 }}
                                            className="w-16 h-16 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"
                                        >
                                            <span className="text-3xl font-bold text-white">
                                                {bidAmount}
                                            </span>
                                        </motion.div>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                setBidAmount((p) =>
                                                    Math.min(13, p + 1),
                                                )
                                            }
                                            disabled={bidAmount >= 13}
                                            className="h-10 w-10 rounded-full border-amber-400/30 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => {
                                        onCommitTeamBlind(bidAmount);
                                        setShowSelector(false);
                                    }}
                                    className="w-full h-12 font-semibold rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                                >
                                    Lock In Team Blind Bid
                                </Button>

                                <Button
                                    onClick={() => setShowSelector(false)}
                                    variant="ghost"
                                    className="w-full text-white/60 hover:text-white hover:bg-white/10"
                                >
                                    Back
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {!showSelector && !lockedByTeam && (
                    <div className="flex items-center gap-2 text-xs text-white/50 text-center">
                        <EyeOff className="w-4 h-4" />
                        <span>
                            Decide together. Either teammate&apos;s reveal or
                            commit locks the choice for both.
                        </span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
