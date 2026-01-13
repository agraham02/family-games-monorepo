import { useWebSocket } from "@/contexts/WebSocketContext";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import SpadesGameTable from "./ui/SpadesGameTable";
import {
    GameScoreboard,
    GameMenu,
    GameSettingToggle,
    useGameSetting,
} from "@/components/games/shared";
import { SpadesData, SpadesPlayerData, PlayingCard } from "@shared/types";
import PlaceBidModal from "./ui/PlaceBidModal";
import BlindBidModal from "./ui/BlindBidModal";
import RoundSummaryModal from "./ui/RoundSummaryModal";
import GameSummaryModal from "./ui/GameSummaryModal";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useWebSocketError } from "@/hooks";

// Wrapper component for BlindBidModal to properly use hooks
function BlindBidModalWrapper({
    blindBidModalOpen,
    onClose,
    canBlindNil,
    canBlindBid,
    teamScoreDeficit,
    onChooseBlindNil,
    onChooseBlindBid,
}: {
    blindBidModalOpen: boolean;
    onClose: () => void;
    canBlindNil: boolean;
    canBlindBid: boolean;
    teamScoreDeficit: number;
    onChooseBlindNil: () => void;
    onChooseBlindBid: (amount: number) => void;
}) {
    return (
        <BlindBidModal
            isOpen={blindBidModalOpen}
            onClose={onClose}
            canBlindNil={canBlindNil}
            canBlindBid={canBlindBid}
            teamScoreDeficit={teamScoreDeficit}
            onChooseBlindNil={onChooseBlindNil}
            onChooseBlindBid={onChooseBlindBid}
        />
    );
}

export default function Spades({
    gameData,
    playerData,
    dispatchOptimisticAction,
    roomCode,
}: {
    gameData: SpadesData;
    playerData: SpadesPlayerData;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    roomCode?: string;
}) {
    const { socket, connected } = useWebSocket();
    const { roomId, userId } = useSession();

    // Enable WebSocket error handling with toasts
    useWebSocketError();

    const sendGameAction = React.useCallback(
        (type: string, payload: unknown) => {
            // Use optimistic action dispatcher if available, otherwise fallback to direct emit
            if (dispatchOptimisticAction) {
                dispatchOptimisticAction(type, payload);
            } else {
                // Fallback for backwards compatibility
                if (!socket || !connected) return;
                const action = {
                    type,
                    payload,
                    userId,
                };
                socket.emit("game_action", { roomId, action });
            }
        },
        [dispatchOptimisticAction, socket, connected, userId, roomId]
    );

    // For non-player system actions (CONTINUE_AFTER_TRICK_RESULT, CONTINUE_AFTER_ROUND_SUMMARY)
    // These don't need optimistic updates and shouldn't block player actions
    const sendSystemAction = React.useCallback(
        (type: string, payload: unknown) => {
            if (!socket || !connected) return;
            const action = {
                type,
                payload,
                userId,
            };
            socket.emit("game_action", { roomId, action });
        },
        [socket, connected, userId, roomId]
    );

    // Assume gameData has phase, players, currentIndex, and bids fields
    const isBiddingPhase = gameData.phase === "bidding";
    const isMyTurn = gameData.playOrder[gameData.currentTurnIndex] === userId;
    const isLeader = userId === gameData.leaderId;
    const showHints = useGameSetting("spades.showHints", false);
    const [bid, setBid] = useState<number>(1);
    const [bidModalOpen, setBidModalOpen] = useState(false);
    const [blindBidModalOpen, setBlindBidModalOpen] = useState(false);
    const [hasSeenCards, setHasSeenCards] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate blind bid eligibility
    const blindBidEligibility = useMemo(() => {
        let playerTeamId: number | undefined;
        Object.entries(gameData.teams).forEach(([teamId, team]) => {
            if (team.players.includes(userId)) {
                playerTeamId = Number(teamId);
            }
        });

        const isEligible =
            playerTeamId !== undefined &&
            (gameData.teamEligibleForBlind?.[playerTeamId] || false);

        const maxScore = Math.max(
            ...Object.values(gameData.teams).map((t) => t.score),
            0
        );
        const teamScoreDeficit =
            playerTeamId !== undefined
                ? maxScore - gameData.teams[playerTeamId].score
                : 0;

        return {
            isEligible,
            canBlindNil:
                isEligible &&
                gameData.settings.allowNil &&
                gameData.settings.blindNilEnabled,
            canBlindBid: isEligible && gameData.settings.blindBidEnabled,
            teamScoreDeficit,
        };
    }, [
        gameData.teams,
        gameData.teamEligibleForBlind,
        gameData.settings,
        userId,
    ]);

    const canShowBlindBid =
        blindBidEligibility.isEligible &&
        (blindBidEligibility.canBlindNil || blindBidEligibility.canBlindBid);

    // Reset hasSeenCards at start of each bidding phase
    useEffect(() => {
        if (isBiddingPhase) {
            setHasSeenCards(false);
        }
    }, [isBiddingPhase, gameData.round]);

    // Auto-show appropriate modal when it's my turn
    useEffect(() => {
        if (isMyTurn && isBiddingPhase && !hasSeenCards) {
            if (canShowBlindBid) {
                setBlindBidModalOpen(true);
            } else {
                // Not eligible for blind bid, skip directly to regular bidding
                setHasSeenCards(true);
            }
        }
    }, [isMyTurn, isBiddingPhase, hasSeenCards, canShowBlindBid]);

    // Close blind bid modal when it's no longer the player's turn or phase changes
    // This handles the case when timer expires and auto-bid is placed
    useEffect(() => {
        if (blindBidModalOpen && (!isMyTurn || !isBiddingPhase)) {
            setBlindBidModalOpen(false);
            // Also mark as seen since the turn has passed
            if (!isBiddingPhase) {
                setHasSeenCards(false); // Reset for next round
            }
        }
    }, [blindBidModalOpen, isMyTurn, isBiddingPhase]);

    // Also close the regular bid modal when turn changes
    useEffect(() => {
        if (bidModalOpen && (!isMyTurn || !isBiddingPhase)) {
            setBidModalOpen(false);
        }
    }, [bidModalOpen, isMyTurn, isBiddingPhase]);

    function handleBidChange(delta: number) {
        // Minimum bid is 1 (0 requires Nil bid)
        setBid((prev: number) => Math.max(1, Math.min(13, prev + delta)));
    }

    function handleSubmitBid(isNil: boolean) {
        if (!isMyTurn) {
            toast.error("It's not your turn!");
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        const bidData = {
            amount: isNil ? 0 : bid,
            type: isNil ? "nil" : "normal",
            isBlind: false,
        };
        sendGameAction("PLACE_BID", { bid: bidData });
        setBid(1);

        // Reset loading state after delay
        setTimeout(() => setIsSubmitting(false), 500);
    }

    function handleBlindNil() {
        if (isSubmitting) return;

        setIsSubmitting(true);
        sendGameAction("PLACE_BID", {
            bid: { amount: 0, type: "blind-nil", isBlind: true },
        });
        setBlindBidModalOpen(false);
        setHasSeenCards(true);

        setTimeout(() => setIsSubmitting(false), 500);
    }

    function handleBlindBid(amount: number) {
        if (isSubmitting) return;

        setIsSubmitting(true);
        sendGameAction("PLACE_BID", {
            bid: { amount, type: "blind", isBlind: true },
        });
        setBlindBidModalOpen(false);
        setHasSeenCards(true);

        setTimeout(() => setIsSubmitting(false), 500);
    }

    function handleDeclineBlind() {
        setBlindBidModalOpen(false);
        setHasSeenCards(true);
    }

    function handleReturnToLobby() {
        if (!socket || !connected) return;
        socket.emit("abort_game", { roomId, userId });
    }

    const handleCardPlay = useCallback(
        (card: PlayingCard) => {
            if (!isMyTurn) return;
            sendGameAction("PLAY_CARD", { card });
        },
        [isMyTurn, sendGameAction]
    );

    // Build team scores for scoreboard
    const teamScores = Object.entries(gameData.teams).map(([teamId, team]) => ({
        teamId,
        teamName: `Team ${Number(teamId) + 1}`,
        players: team.players.map((pid) => gameData.players[pid]?.name || pid),
        score: team.score,
        roundScore: gameData.roundTeamScores?.[Number(teamId)],
    }));

    // Build player bids for scoreboard
    const playerBids = gameData.playOrder.map((playerId) => ({
        playerId,
        playerName: gameData.players[playerId]?.name || playerId,
        bid: gameData.bids[playerId]?.amount ?? null,
        tricksWon: gameData.roundTrickCounts?.[playerId] ?? 0,
    }));

    useEffect(() => {
        if (isMyTurn && isBiddingPhase) {
            setBidModalOpen(true);
        } else {
            setBidModalOpen(false);
        }
        if (gameData.phase === "trick-result" && userId === gameData.leaderId) {
            const timer = setTimeout(() => {
                sendSystemAction("CONTINUE_AFTER_TRICK_RESULT", {});
            }, 3000); // 3 seconds

            return () => clearTimeout(timer);
        }
        // Auto-continue from round-summary after timeout (includes on refresh/mount)
        if (
            gameData.phase === "round-summary" &&
            userId === gameData.leaderId
        ) {
            const timer = setTimeout(() => {
                sendSystemAction("CONTINUE_AFTER_ROUND_SUMMARY", {});
            }, 10000); // 10 seconds to allow viewing the summary

            return () => clearTimeout(timer);
        }
    }, [
        gameData.phase,
        isMyTurn,
        isBiddingPhase,
        userId,
        gameData.leaderId,
        sendSystemAction,
    ]);

    return (
        <div className="h-screen w-full overflow-hidden">
            <SpadesGameTable
                gameData={gameData}
                playerData={playerData}
                isMyTurn={isMyTurn}
                onCardPlay={handleCardPlay}
                showHints={showHints}
            />

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId}>
                <GameSettingToggle
                    storageKey="spades.showHints"
                    label="Show Valid Moves"
                    icon={<Lightbulb className="h-4 w-4" />}
                    defaultValue={false}
                />
            </GameMenu>

            {/* Scoreboard */}
            <GameScoreboard
                teams={teamScores}
                playerBids={playerBids}
                round={gameData.round}
                phase={gameData.phase}
                winTarget={gameData.settings?.winTarget}
            />

            <Button
                className="fixed bottom-6 right-6 z-40 px-4 py-2 rounded-lg shadow-md bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                onClick={() => setBidModalOpen(true)}
                style={{
                    display:
                        isMyTurn && isBiddingPhase && !bidModalOpen
                            ? "block"
                            : "none",
                }}
            >
                Place Bid
            </Button>

            {/* Blind Bid Modal - shown first if eligible */}
            <BlindBidModalWrapper
                blindBidModalOpen={blindBidModalOpen}
                onClose={handleDeclineBlind}
                canBlindNil={blindBidEligibility.canBlindNil}
                canBlindBid={blindBidEligibility.canBlindBid}
                teamScoreDeficit={blindBidEligibility.teamScoreDeficit}
                onChooseBlindNil={handleBlindNil}
                onChooseBlindBid={handleBlindBid}
            />

            <PlaceBidModal
                bid={bid}
                bidModalOpen={bidModalOpen && hasSeenCards}
                setBidModalOpen={setBidModalOpen}
                handleBidChange={handleBidChange}
                handleSubmitBid={handleSubmitBid}
                allowNil={gameData.settings.allowNil}
                isSubmitting={isSubmitting}
            />

            {/* Round Summary Modal */}
            <RoundSummaryModal
                gameData={gameData}
                sendGameAction={sendGameAction}
            />

            {/* Game Summary Modal */}
            <GameSummaryModal
                gameData={gameData}
                onReturnToLobby={handleReturnToLobby}
            />
        </div>
    );
}
