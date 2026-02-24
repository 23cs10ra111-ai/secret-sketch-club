import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, Trophy, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DrawingCanvas from "@/components/DrawingCanvas";
import GameChat from "@/components/GameChat";
import { useGameStore, ChatMessage } from "@/stores/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { getRandomWord } from "@/lib/words";
import { toast } from "sonner";

const Game = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    room, players, currentPlayer, userId,
    setRoom, setPlayers, setCurrentPlayer,
    currentRound, setCurrentRound,
    secretWord, setSecretWord,
    timeRemaining, setTimeRemaining,
    chatMessages, addChatMessage, clearChat,
    drawingStrokes, addDrawingStroke, setDrawingStrokes,
    resetGame,
  } = useGameStore();

  const [clearSignal, setClearSignal] = useState(0);
  const [incomingStrokes, setIncomingStrokes] = useState<any[]>([]);
  const [roundEnded, setRoundEnded] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const channelRef = useRef<any>(null);
  const drawChannelRef = useRef<any>(null);
  const isArtistRef = useRef(false);

  const gameState = room?.game_state;
  const isArtist = gameState?.artist_id === currentPlayer?.id;
  const artistPlayer = players.find((p) => p.id === gameState?.artist_id);

  // Keep ref in sync
  useEffect(() => {
    isArtistRef.current = isArtist;
  }, [isArtist]);

  // Load room & round data
  useEffect(() => {
    if (!room && code) loadRoom();
  }, [code]);

  const loadRoom = async () => {
    if (!code) return;
    const { data: roomData } = await supabase.from("rooms").select().eq("code", code).single();
    if (!roomData) { navigate("/"); return; }
    setRoom(roomData as any);

    const { data: playersData } = await supabase.from("players").select().eq("room_id", roomData.id);
    setPlayers((playersData || []) as any);

    if (userId) {
      const me = playersData?.find((p: any) => p.user_id === userId);
      if (me) setCurrentPlayer(me as any);
    }

    // Load current round
    const { data: roundData } = await supabase
      .from("rounds")
      .select()
      .eq("room_id", roomData.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roundData) {
      setCurrentRound(roundData as any);
      const gs = (roomData as any).game_state;
      const me = playersData?.find((p: any) => p.user_id === userId);
      if (me && gs?.artist_id === me.id) {
        setSecretWord(roundData.secret_word);
      }
    }
  };

  // Setup realtime channels
  useEffect(() => {
    if (!room) return;

    const roomChannel = supabase.channel(`game-room-${room.id}`);
    channelRef.current = roomChannel;

    roomChannel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        addChatMessage(payload as ChatMessage);
      })
      .on("broadcast", { event: "correct_guess" }, ({ payload }) => {
        handleCorrectGuess(payload);
      })
      .on("broadcast", { event: "round_end" }, ({ payload }) => {
        handleRoundEnd(payload);
      })
      .on("broadcast", { event: "next_round" }, ({ payload }) => {
        handleNextRound(payload);
      })
      .on("broadcast", { event: "game_over" }, () => {
        setGameOver(true);
      })
      .on("broadcast", { event: "clear_canvas" }, () => {
        setClearSignal((s) => s + 1);
        setIncomingStrokes([]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, (payload) => {
        setRoom(payload.new as any);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` }, () => {
        refreshPlayers();
      })
      .subscribe();

    // Drawing channel - use ref to avoid closure stale isArtist
    const drawCh = supabase.channel(`drawing-${room.id}`);
    drawChannelRef.current = drawCh;

    drawCh
      .on("broadcast", { event: "stroke" }, ({ payload }) => {
        if (!isArtistRef.current) {
          setIncomingStrokes((prev) => [...prev, payload]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(drawCh);
    };
  }, [room?.id]);

  const refreshPlayers = async () => {
    if (!room) return;
    const { data } = await supabase.from("players").select().eq("room_id", room.id);
    if (data) setPlayers(data as any);
  };

  // Timer
  useEffect(() => {
    if (!currentRound || roundEnded || gameOver) return;
    setTimeRemaining(60);
    timerRef.current = setInterval(() => {
      setTimeRemaining(useGameStore.getState().timeRemaining - 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentRound?.id]);

  useEffect(() => {
    if (timeRemaining <= 0 && currentRound && !roundEnded && isArtist) {
      endRound(null);
    }
  }, [timeRemaining]);

  const endRound = async (guesserId: string | null) => {
    if (!room || !currentRound) return;
    setRoundEnded(true);
    clearInterval(timerRef.current);

    await supabase.from("rounds").update({
      ended_at: new Date().toISOString(),
      correct_guesser_id: guesserId,
    }).eq("id", currentRound.id);

    // Award points
    if (guesserId) {
      const guesser = players.find(p => p.id === guesserId);
      const artist = players.find(p => p.id === gameState?.artist_id);
      if (guesser) {
        await supabase.from("players").update({ score: guesser.score + 10 }).eq("id", guesserId);
      }
      if (artist) {
        await supabase.from("players").update({ score: artist.score + 5 }).eq("id", artist.id);
      }
    }

    // Broadcast round end
    channelRef.current?.send({
      type: "broadcast",
      event: "round_end",
      payload: {
        word: currentRound.secret_word,
        guesserId,
        guesserName: guesserId ? players.find(p => p.id === guesserId)?.username : null,
      },
    });

    // Refresh players
    await refreshPlayers();

    // After 5 seconds, start next round or end game
    setTimeout(async () => {
      const gs = useGameStore.getState().room?.game_state;
      if (!gs) return;
      const round = gs.current_round;
      if (round >= gs.total_rounds) {
        channelRef.current?.send({ type: "broadcast", event: "game_over", payload: {} });
        setGameOver(true);
        await supabase.from("rooms").update({ game_state: { ...gs, status: "game_over" } }).eq("id", room.id);
      } else {
        await startNextRound(round + 1);
      }
    }, 5000);
  };

  const startNextRound = async (roundNum: number) => {
    if (!room) return;
    const latestRoom = useGameStore.getState().room;
    const gs = latestRoom?.game_state || room.game_state;
    const latestPlayers = useGameStore.getState().players;
    const playerIds = latestPlayers.map(p => p.id);
    const currentArtistIdx = playerIds.indexOf(gs.artist_id || "");
    const nextArtistId = playerIds[(currentArtistIdx + 1) % playerIds.length];
    const word = getRandomWord(gs.category);

    await supabase.from("rooms").update({
      game_state: { ...gs, current_round: roundNum, artist_id: nextArtistId, status: "playing" },
      last_activity: new Date().toISOString(),
    }).eq("id", room.id);

    const { data: newRound } = await supabase.from("rounds").insert({
      room_id: room.id,
      artist_id: nextArtistId,
      secret_word: word,
    }).select().single();

    channelRef.current?.send({
      type: "broadcast",
      event: "next_round",
      payload: { roundId: newRound?.id, roundNum, artistId: nextArtistId },
    });

    setRoundEnded(false);
    setIncomingStrokes([]);
    setClearSignal(s => s + 1);
    setCurrentRound(newRound as any);
    const cp = useGameStore.getState().currentPlayer;
    setSecretWord(nextArtistId === cp?.id ? word : null);
    clearChat();
  };

  const handleCorrectGuess = (payload: any) => {
    addChatMessage({
      id: crypto.randomUUID(),
      player_id: payload.playerId,
      username: payload.username,
      message: `🎉 ${payload.username} guessed correctly!`,
      is_system: true,
      is_correct: true,
      timestamp: Date.now(),
    });
  };

  const handleRoundEnd = (payload: any) => {
    setRoundEnded(true);
    clearInterval(timerRef.current);
    setSecretWord(payload.word);
    refreshPlayers();
  };

  const handleNextRound = async (payload: any) => {
    setRoundEnded(false);
    setIncomingStrokes([]);
    setClearSignal(s => s + 1);
    clearChat();
    if (room) {
      const { data } = await supabase.from("rounds").select().eq("room_id", room.id).is("ended_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setCurrentRound(data as any);
        const cp = useGameStore.getState().currentPlayer;
        if (payload.artistId === cp?.id) {
          setSecretWord(data.secret_word);
        } else {
          setSecretWord(null);
        }
      }
      const { data: roomData } = await supabase.from("rooms").select().eq("id", room.id).single();
      if (roomData) setRoom(roomData as any);
    }
  };

  const handleStroke = (stroke: any) => {
    drawChannelRef.current?.send({ type: "broadcast", event: "stroke", payload: stroke });
  };

  const handleClearCanvas = () => {
    setClearSignal(s => s + 1);
    channelRef.current?.send({ type: "broadcast", event: "clear_canvas", payload: {} });
  };

  const handleSendMessage = async (text: string) => {
    const cp = useGameStore.getState().currentPlayer;
    const cr = useGameStore.getState().currentRound;
    if (!cp || !cr) return;

    // Validate guess server-side
    try {
      const { data, error } = await supabase.functions.invoke("submit-guess", {
        body: { round_id: cr.id, guess: text, player_id: cp.id },
      });

      if (data?.correct) {
        // Correct guess!
        channelRef.current?.send({
          type: "broadcast",
          event: "correct_guess",
          payload: { playerId: cp.id, username: cp.username },
        });
        endRound(cp.id);
        return;
      }
    } catch (e) {
      // Fall through to regular message
    }

    // Regular message
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      player_id: cp.id,
      username: cp.username,
      message: text,
      is_system: false,
      timestamp: Date.now(),
    };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    addChatMessage(msg);
  };

  const handlePlayAgain = async () => {
    if (!room) return;
    for (const p of players) {
      await supabase.from("players").update({ score: 0 }).eq("id", p.id);
    }
    await supabase.from("rooms").update({
      game_state: { status: "lobby", current_round: 0, total_rounds: 5, category: room.game_state.category, word_list: [] },
    }).eq("id", room.id);
    resetGame();
    setGameOver(false);
    navigate(`/lobby/${code}`);
  };

  const handleLeave = async () => {
    if (currentPlayer) {
      await supabase.from("players").delete().eq("id", currentPlayer.id);
    }
    resetGame();
    navigate("/");
  };

  // Game Over Screen
  if (gameOver) {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="sketch-border bg-card w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-bold font-fredoka text-primary">Game Over!</h1>
            <div className="space-y-2">
              {sorted.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? "bg-accent/20" : "bg-muted/50"}`}>
                  <span className="font-hand text-lg">
                    {i === 0 ? "👑 " : `${i + 1}. `}
                    {p.username}
                  </span>
                  <Badge variant={i === 0 ? "default" : "secondary"}>{p.score} pts</Badge>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={handlePlayAgain} className="flex-1 bg-primary font-semibold">Play Again</Button>
              <Button onClick={handleLeave} variant="outline" className="flex-1 font-semibold">Leave</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Round End Overlay
  if (roundEnded && secretWord) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="sketch-border bg-card w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold font-fredoka text-foreground">Round Over!</h2>
            <p className="font-hand text-xl text-muted-foreground">The word was:</p>
            <p className="text-3xl font-bold font-fredoka text-primary">{secretWord}</p>
            <p className="text-muted-foreground font-hand">Next round starting soon...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-hand text-sm">Room: {code}</Badge>
          <Badge variant="secondary" className="font-hand">
            Round {gameState?.current_round || 0}/{gameState?.total_rounds || 5}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Progress value={(timeRemaining / 60) * 100} className="w-24 h-2" />
          <span className="font-fredoka font-bold text-foreground w-8">{timeRemaining}s</span>
        </div>
      </div>

      {/* Artist hint */}
      {isArtist && secretWord && (
        <div className="text-center py-2 bg-primary/10">
          <span className="font-hand text-lg text-foreground">
            <Palette className="inline h-5 w-5 mr-1 text-primary" />
            Draw: <strong className="text-primary">{secretWord}</strong>
          </span>
        </div>
      )}
      {!isArtist && (
        <div className="text-center py-2 bg-secondary/10">
          <span className="font-hand text-lg text-muted-foreground">
            {artistPlayer?.username || "The Artist"} is drawing... Guess the word!
          </span>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 p-4 overflow-auto">
          <DrawingCanvas
            isArtist={isArtist}
            onStroke={handleStroke}
            onClear={handleClearCanvas}
            incomingStrokes={incomingStrokes}
            clearSignal={clearSignal}
          />
        </div>

        {/* Right Panel: Chat + Leaderboard */}
        <div className="w-80 border-l border-border flex flex-col bg-card">
          {/* Mini Leaderboard */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-1 mb-2">
              <Trophy className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Scores</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...players].sort((a, b) => b.score - a.score).map(p => (
                <Badge key={p.id} variant={p.id === gameState?.artist_id ? "default" : "outline"} className="text-xs font-hand">
                  {p.username}: {p.score}
                </Badge>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <GameChat
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              disabled={isArtist}
              disabledReason="You're the Artist!"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
