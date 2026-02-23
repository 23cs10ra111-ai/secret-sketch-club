import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, Crown, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameStore } from "@/stores/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { WORD_LISTS, getRandomWord } from "@/lib/words";
import { toast } from "sonner";

const Lobby = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, players, currentPlayer, setRoom, setPlayers, setCurrentPlayer, userId, username } = useGameStore();
  const [category, setCategory] = useState("all");
  const [starting, setStarting] = useState(false);

  const isHost = currentPlayer?.is_host === true;

  // Load room data if navigated directly
  useEffect(() => {
    if (!room && code) {
      loadRoom();
    }
  }, [code]);

  const loadRoom = async () => {
    if (!code) return;
    const { data: roomData } = await supabase.from("rooms").select().eq("code", code).single();
    if (!roomData) {
      toast.error("Room not found");
      navigate("/");
      return;
    }
    setRoom(roomData as any);
    const { data: playersData } = await supabase.from("players").select().eq("room_id", roomData.id);
    setPlayers((playersData || []) as any);

    if (userId) {
      const me = playersData?.find((p: any) => p.user_id === userId);
      if (me) setCurrentPlayer(me as any);
    }
  };

  // Subscribe to player changes
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`lobby-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` }, () => {
        loadPlayersOnly();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, (payload) => {
        const updated = payload.new as any;
        setRoom(updated);
        if (updated.game_state?.status === "playing") {
          navigate(`/game/${code}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  const loadPlayersOnly = async () => {
    if (!room) return;
    const { data } = await supabase.from("players").select().eq("room_id", room.id);
    setPlayers((data || []) as any);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code || "");
    toast.success("Room code copied!");
  };

  const handleStartGame = async () => {
    if (!room || players.length < 2) {
      toast.error("Need at least 2 players to start!");
      return;
    }
    setStarting(true);
    try {
      const wordList = [...(WORD_LISTS[category] || WORD_LISTS.all)];
      const artistId = players[0].id;
      const secretWord = getRandomWord(category);

      // Update room game state
      const { error: roomErr } = await supabase
        .from("rooms")
        .update({
          game_state: {
            status: "playing",
            current_round: 1,
            total_rounds: 5,
            category,
            word_list: wordList,
            artist_id: artistId,
          },
          last_activity: new Date().toISOString(),
        })
        .eq("id", room.id);
      if (roomErr) throw roomErr;

      // Create round
      const { error: roundErr } = await supabase
        .from("rounds")
        .insert({
          room_id: room.id,
          artist_id: artistId,
          secret_word: secretWord,
        });
      if (roundErr) throw roundErr;

      navigate(`/game/${code}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to start game");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Room Code */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground font-hand mb-1">Room Code</p>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 text-4xl font-bold font-fredoka tracking-[0.3em] text-primary hover:text-primary/80 transition-colors"
          >
            {code}
            <Copy className="h-5 w-5" />
          </button>
          <p className="text-sm text-muted-foreground mt-1">Share this code with friends!</p>
        </div>

        {/* Players */}
        <Card className="sketch-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-secondary" />
              Players ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <span className="font-semibold font-hand text-lg text-foreground">
                  {p.username}
                  {p.user_id === userId && " (you)"}
                </span>
                {p.is_host && (
                  <Badge className="bg-accent text-accent-foreground">
                    <Crown className="h-3 w-3 mr-1" /> Host
                  </Badge>
                )}
              </div>
            ))}
            {players.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-2 font-hand">
                Waiting for more players to join...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Host Controls */}
        {isHost && (
          <Card className="sketch-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Word Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="animals">🐾 Animals</SelectItem>
                    <SelectItem value="objects">🚀 Objects</SelectItem>
                    <SelectItem value="food">🍕 Food</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStartGame}
                disabled={starting || players.length < 2}
                className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Game
              </Button>
            </CardContent>
          </Card>
        )}

        {!isHost && (
          <p className="text-center text-muted-foreground font-hand text-lg">
            Waiting for the host to start the game... 🎨
          </p>
        )}
      </div>
    </div>
  );
};

export default Lobby;
