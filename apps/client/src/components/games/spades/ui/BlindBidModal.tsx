import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Zap, Ban, Minus, Plus } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export default function BlindBidModal({
    isOpen,
    onClose,
    canBlindNil,
    canBlindBid,
    teamScoreDeficit,
    onChooseBlindNil,
    onChooseBlindBid,
}: {
    isOpen: boolean;
    onClose: () => void;
    canBlindNil: boolean;
    canBlindBid: boolean;
    teamScoreDeficit: number;
    onChooseBlindNil: () => void;
    onChooseBlindBid: (amount: number) => void;
}) {
    const [showBlindBidSelector, setShowBlindBidSelector] = useState(false);
    const [blindBidAmount, setBlindBidAmount] = useState(4);

    function handleBlindBidSubmit() {
        onChooseBlindBid(blindBidAmount);
        setShowBlindBidSelector(false);
    }

    function handleClose() {
        setShowBlindBidSelector(false);
        setBlindBidAmount(4);
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30 text-white p-4 sm:p-6 shadow-2xl">
                <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-amber-400 text-center">
                    <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-pulse" />
                    Blind Bid Opportunity
                </DialogTitle>

                <DialogDescription className="sr-only">
                    Choose to bid without seeing your cards for double points,
                    or decline to see your cards
                </DialogDescription>

                <div className="w-full space-y-4">
                    {/* Team Score Context */}
                    <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-center">
                        <p className="text-sm text-red-300 font-medium">
                            Your team is{" "}
                            <span className="text-2xl font-bold text-red-400">
                                {teamScoreDeficit}
                            </span>{" "}
                            points behind
                        </p>
                        <p className="text-xs text-red-200/80 mt-1">
                            Time for a comeback! Blind bids earn double points.
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {!showBlindBidSelector ? (
                            <motion.div
                                key="options"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                {/* Blind Nil Option */}
                                {canBlindNil && (
                                    <Button
                                        onClick={onChooseBlindNil}
                                        className={cn(
                                            "w-full h-auto py-4 px-5 flex flex-col items-start gap-2",
                                            "bg-gradient-to-r from-red-600 to-red-700",
                                            "hover:from-red-700 hover:to-red-800",
                                            "border-2 border-red-400/50",
                                            "text-left transition-all",
                                            "animate-pulse"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Ban className="w-5 h-5" />
                                            <span className="font-bold text-lg">
                                                Bid Blind Nil
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/90">
                                            Win zero tricks without seeing your
                                            cards
                                        </p>
                                        <div className="flex gap-2 text-sm font-semibold">
                                            <span className="text-green-300">
                                                Success: +200 points
                                            </span>
                                            <span className="text-red-300">
                                                Fail: -200 points
                                            </span>
                                        </div>
                                    </Button>
                                )}

                                {/* Blind Bid Option */}
                                {canBlindBid && (
                                    <Button
                                        onClick={() =>
                                            setShowBlindBidSelector(true)
                                        }
                                        className={cn(
                                            "w-full h-auto py-4 px-5 flex flex-col items-start gap-2",
                                            "bg-gradient-to-r from-amber-600 to-orange-600",
                                            "hover:from-amber-700 hover:to-orange-700",
                                            "border-2 border-amber-400/50",
                                            "text-left transition-all"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Zap className="w-5 h-5" />
                                            <span className="font-bold text-lg">
                                                Bid Blind
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/90">
                                            Make a bid (4-13) without seeing
                                            your cards
                                        </p>
                                        <div className="text-sm font-semibold text-green-300">
                                            Earn DOUBLE points if successful!
                                        </div>
                                    </Button>
                                )}

                                {/* Decline Option */}
                                <Button
                                    onClick={handleClose}
                                    variant="outline"
                                    className="w-full h-auto py-3 px-5 flex items-center justify-center gap-2 border-white/30 bg-slate-800/50 hover:bg-slate-700/50 text-white/80 hover:text-white"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>See My Cards</span>
                                </Button>
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
                                        How many tricks will you win?
                                    </p>
                                    <div className="flex items-center justify-center gap-4">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                setBlindBidAmount((prev) =>
                                                    Math.max(4, prev - 1)
                                                )
                                            }
                                            disabled={blindBidAmount <= 4}
                                            className="h-10 w-10 rounded-full border-amber-400/30 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </Button>

                                        <motion.div
                                            key={blindBidAmount}
                                            initial={{ scale: 1.2 }}
                                            animate={{ scale: 1 }}
                                            className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"
                                        >
                                            <span className="text-3xl font-bold text-white">
                                                {blindBidAmount}
                                            </span>
                                        </motion.div>

                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() =>
                                                setBlindBidAmount((prev) =>
                                                    Math.min(13, prev + 1)
                                                )
                                            }
                                            disabled={blindBidAmount >= 13}
                                            className="h-10 w-10 rounded-full border-amber-400/30 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <div className="space-y-1 mt-3">
                                        <p className="text-xs text-emerald-300 font-medium">
                                            ✓ Success: +{blindBidAmount * 20}{" "}
                                            points
                                        </p>
                                        <p className="text-xs text-red-300 font-medium">
                                            ✗ Fail: -{blindBidAmount * 20}{" "}
                                            points
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleBlindBidSubmit}
                                    className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                                >
                                    Submit Blind Bid
                                </Button>

                                <Button
                                    onClick={() =>
                                        setShowBlindBidSelector(false)
                                    }
                                    variant="ghost"
                                    className="w-full text-white/60 hover:text-white hover:bg-white/10"
                                >
                                    Back
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {!showBlindBidSelector && (
                    <div className="flex items-center gap-2 text-xs text-white/50 text-center">
                        <EyeOff className="w-4 h-4" />
                        <span>
                            High risk, high reward. Choose wisely before seeing
                            your cards.
                        </span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
