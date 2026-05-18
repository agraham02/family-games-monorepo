import { useWebSocket } from "@/contexts/WebSocketContext";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import SpadesGameTable from "./ui/SpadesGameTable";
import {
    GameScoreboard,
    GameMenu,
    GameSettingToggle,
    RotateDeviceOverlay,
    useGameSetting,
} from "@/components/games/shared";
import { SpadesData, SpadesPlayerData, PlayingCard } from "@shared/types";
import PlaceBidModal from "./ui/PlaceBidModal";
import BlindBidWindowModal from "./ui/BlindBidWindowModal";
import RoundSummaryModal from "./ui/RoundSummaryModal";
import GameSummaryModal from "./ui/GameSummaryModal";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { useWebSocketError } from "@/hooks";

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
        [dispatchOptimisticAction, socket, connected, userId, roomId],
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
        [socket, connected, userId, roomId],
    );

    // Assume gameData has phase, players, currentIndex, and bids fields
    const isBiddingPhase = gameData.phase === "bidding";
    const isBlindWindowPhase = gameData.phase === "blind-bid-window";
    const isMyTurn =
        gameData.playOrder[gameData.currentTurnIndex] ===
        playerData.localOrdering[0];
    const isLeader = userId === gameData.leaderId;
    const showHints = useGameSetting("spades.showHints", false);
    const [bid, setBid] = useState<number>(1);
    const [bidModalOpen, setBidModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resolve the local player's team id once.
    const myTeamId = useMemo<number | undefined>(() => {
        if (!gameData.teams) return undefined;
        const entry = Object.entries(gameData.teams).find(([, team]) =>
            team.players.includes(userId),
        );
        return entry ? Number(entry[0]) : undefined;
    }, [gameData.teams, userId]);

    // Blind-bid-window state for the local player's team (if any).
    const myTeamBlindState = useMemo(() => {
        if (!gameData.blindWindow || myTeamId === undefined) return undefined;
        return gameData.blindWindow.teams[myTeamId];
    }, [gameData.blindWindow, myTeamId]);

    // Partner info (for team-blind-window context display).
    const partnerInfo = useMemo(() => {
        if (myTeamId === undefined || !gameData.teams) return null;
        const partnerId = gameData.teams[myTeamId].players.find(
            (pid) => pid !== userId,
        );
        if (!partnerId) return null;
        return {
            id: partnerId,
            name: gameData.players?.[partnerId]?.name || partnerId,
        };
    }, [myTeamId, gameData.teams, gameData.players, userId]);

    // Team score deficit (max team score minus ours).
    const teamScoreDeficit = useMemo(() => {
        if (myTeamId === undefined || !gameData.teams) return 0;
        const maxScore = Math.max(
            ...Object.values(gameData.teams).map((t) => t.score),
            0,
        );
        return maxScore - gameData.teams[myTeamId].score;
    }, [myTeamId, gameData.teams]);

    const canBlindBid =
        !!myTeamBlindState?.eligible && gameData.settings.blindBidEnabled;
    const canBlindNil =
        !!myTeamBlindState?.eligible &&
        gameData.settings.allowNil &&
        gameData.settings.blindNilEnabled;

    // Show the blind window modal whenever we are in the window phase AND
    // the local player's team has not yet decided. (`pending` status)
    const showBlindWindowModal =
        isBlindWindowPhase && myTeamBlindState?.status === "pending";

    // Compute team-minimum-bid constraint for the local player.
    // If our partner(s) have already bid this round, our bid must bring the
    // team total to at least settings.teamMinBid.
    const teamMinBidInfo = useMemo(() => {
        const teamMinBid = gameData.settings.teamMinBid ?? 0;
        if (teamMinBid <= 0 || !gameData.teams) {
            return {
                minBid: 1,
                disableNil: false,
                hint: undefined as string | undefined,
            };
        }
        const team = Object.values(gameData.teams).find((t) =>
            t.players.includes(userId),
        );
        if (!team) {
            return { minBid: 1, disableNil: false, hint: undefined };
        }
        const teammates = team.players.filter((pid) => pid !== userId);
        const partnerBids = teammates
            .map((pid) => gameData.bids?.[pid])
            .filter(
                (b): b is { amount: number; type: string; isBlind: boolean } =>
                    Boolean(b),
            );
        // Only enforce once all teammates have bid (so we're the last on the team).
        if (teammates.length === 0 || partnerBids.length < teammates.length) {
            return { minBid: 1, disableNil: false, hint: undefined };
        }
        const partnerTotal = partnerBids.reduce((sum, b) => sum + b.amount, 0);
        const required = teamMinBid - partnerTotal;
        if (required <= 0) {
            return { minBid: 1, disableNil: false, hint: undefined };
        }
        const minBid = Math.max(1, Math.min(13, required));
        return {
            minBid,
            disableNil: true,
            hint: `Team minimum is ${teamMinBid}. Your partner bid ${partnerTotal}, so you must bid at least ${minBid}.`,
        };
    }, [gameData.settings.teamMinBid, gameData.teams, gameData.bids, userId]);

    // Close the bid modal when turn changes or we leave bidding phase.
    useEffect(() => {
        if (bidModalOpen && (!isMyTurn || !isBiddingPhase)) {
            setBidModalOpen(false);
        }
    }, [bidModalOpen, isMyTurn, isBiddingPhase]);

    // Keep the staged bid at or above the team-minimum requirement.
    useEffect(() => {
        setBid((prev) =>
            prev < teamMinBidInfo.minBid ? teamMinBidInfo.minBid : prev,
        );
    }, [teamMinBidInfo.minBid]);

    // Push the un-submitted bid amount to the server (debounced) so that if the
    // turn timer expires before the player confirms, the server's auto-bid uses
    // the value they had landed on instead of the bare minimum.
    useEffect(() => {
        if (!isMyTurn || !isBiddingPhase) return;
        // If this player has already placed a bid, nothing to stage.
        if (gameData.bids?.[userId]) return;
        const handle = setTimeout(() => {
            sendSystemAction("STAGE_BID", { amount: bid });
        }, 250);
        return () => clearTimeout(handle);
    }, [
        bid,
        isMyTurn,
        isBiddingPhase,
        gameData.bids,
        userId,
        sendSystemAction,
    ]);

    function handleBidChange(delta: number) {
        // Minimum bid is teamMinBidInfo.minBid (default 1 — 0 requires Nil bid)
        setBid((prev: number) =>
            Math.max(teamMinBidInfo.minBid, Math.min(13, prev + delta)),
        );
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

    function handleCommitTeamBlind(amount: number) {
        if (isSubmitting) return;
        setIsSubmitting(true);
        sendGameAction("COMMIT_TEAM_BLIND_BID", { amount });
        setTimeout(() => setIsSubmitting(false), 500);
    }

    function handleCommitBlindNil() {
        if (isSubmitting) return;
        setIsSubmitting(true);
        sendGameAction("COMMIT_BLIND_NIL", {});
        setTimeout(() => setIsSubmitting(false), 500);
    }

    function handleRevealHands() {
        if (isSubmitting) return;
        setIsSubmitting(true);
        sendGameAction("REVEAL_TEAM_HANDS", {});
        setTimeout(() => setIsSubmitting(false), 500);
    }

    function handleReturnToLobby() {
        if (!socket || !connected) return;
        // Leader fully tears down the game (everyone returns to lobby);
        // non-leaders quietly demote themselves to spectator while the game
        // stays "finished" until the leader ends it or the server-side
        // auto-cleanup elapses.
        const isLeader = userId === gameData.leaderId;
        if (isLeader) {
            socket.emit("abort_game", { roomId, userId });
        } else {
            socket.emit("return_to_lobby", { roomId, userId });
        }
    }

    const handleCardPlay = useCallback(
        (card: PlayingCard) => {
            if (!isMyTurn) return;
            sendGameAction("PLAY_CARD", { card });
        },
        [isMyTurn, sendGameAction],
    );

    // Build team scores for scoreboard
    const teamScores = Object.entries(gameData.teams ?? {}).map(
        ([teamId, team]) => ({
            teamId,
            teamName: `Team ${Number(teamId) + 1}`,
            players: team.players.map(
                (pid) => gameData.players?.[pid]?.name || pid,
            ),
            score: team.score,
            roundScore: gameData.roundTeamScores?.[Number(teamId)],
        }),
    );

    // Build player bids for scoreboard
    const playerBids = gameData.playOrder.map((playerId) => ({
        playerId,
        playerName: gameData.players?.[playerId]?.name || playerId,
        bid: gameData.bids?.[playerId]?.amount ?? null,
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

    // Guard: stale cross-game data during debug page switching
    if (!gameData.teams || !gameData.players || !gameData.bids) {
        return null;
    }

    return (
        <div className="h-[100dvh] w-full overflow-hidden">
            <RotateDeviceOverlay />
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

            {/* Team Blind-Bid Window Modal */}
            <BlindBidWindowModal
                isOpen={showBlindWindowModal}
                teamState={myTeamBlindState}
                deadlineMs={gameData.blindWindow?.deadline ?? Date.now()}
                teamScoreDeficit={teamScoreDeficit}
                canBlindBid={canBlindBid}
                canBlindNil={canBlindNil}
                partner={partnerInfo}
                selfId={userId}
                onCommitTeamBlind={handleCommitTeamBlind}
                onCommitBlindNil={handleCommitBlindNil}
                onRevealHands={handleRevealHands}
            />

            <PlaceBidModal
                bid={bid}
                bidModalOpen={bidModalOpen}
                setBidModalOpen={setBidModalOpen}
                handleBidChange={handleBidChange}
                handleSubmitBid={handleSubmitBid}
                allowNil={gameData.settings.allowNil}
                isSubmitting={isSubmitting}
                minBid={teamMinBidInfo.minBid}
                disableNil={teamMinBidInfo.disableNil}
                teamMinBidHint={teamMinBidInfo.hint}
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
