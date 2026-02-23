import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGameStore } from "@/stores/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomCode } from "@/lib/words";
import { toast } from "sonner";

const Index = () => {
  const { username, setUsername, setUserId, setRoom, setCurrentPlayer, setPlayers } = useGameStore();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const ensureAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
      return session.user.id;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    setUserId(data.user!.id);
    return data.user!.id;
  };

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      toast.error("Please enter a username!");
      return;
    }
    setLoading(true);
    try {
      const userId = await ensureAuth();
      const code = generateRoomCode();

      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .insert({ code, host_id: userId })
        .select()
        .single();
      if (roomErr) throw roomErr;

      const { data: player, error: playerErr } = await supabase
        .from("players")
        .insert({ room_id: room.id, user_id: userId, username: username.trim(), is_host: true })
        .select()
        .single();
      if (playerErr) throw playerErr;

      setRoom(room as any);
      setCurrentPlayer(player as any);
      setPlayers([player as any]);
      navigate(`/lobby/${code}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!username.trim()) {
      toast.error("Please enter a username!");
      return;
    }
    if (roomCode.length !== 6) {
      toast.error("Room code must be 6 digits!");
      return;
    }
    setLoading(true);
    try {
      const userId = await ensureAuth();

      const { data: room, error: roomErr } = await supabase
        .from("rooms")
        .select()
        .eq("code", roomCode)
        .single();
      if (roomErr || !room) {
        toast.error("Room not found!");
        return;
      }

      // Check if already in room
      const { data: existing } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id)
        .eq("user_id", userId)
        .maybeSingle();

      let player;
      if (existing) {
        player = existing;
      } else {
        const { data: newPlayer, error: playerErr } = await supabase
          .from("players")
          .insert({ room_id: room.id, user_id: userId, username: username.trim(), is_host: false })
          .select()
          .single();
        if (playerErr) throw playerErr;
        player = newPlayer;
      }

      const { data: allPlayers } = await supabase
        .from("players")
        .select()
        .eq("room_id", room.id);

      setRoom(room as any);
      setCurrentPlayer(player as any);
      setPlayers((allPlayers || []) as any);
      navigate(`/lobby/${roomCode}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center animate-bounce-in">
          <div className="inline-flex items-center gap-3 mb-2">
            <Pencil className="h-10 w-10 text-primary" />
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-fredoka text-foreground leading-tight">
            The Secret<br />
            <span className="text-primary">Sketch Club</span>
          </h1>
          <p className="mt-3 text-lg font-hand text-muted-foreground">
            Draw, guess & have fun with friends!
          </p>
        </div>

        {/* Username */}
        <Card className="sketch-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Your Name</label>
              <Input
                placeholder="Enter a fun username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="text-lg h-12 font-hand bg-background"
              />
            </div>

            {/* Join Room */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Room Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="6-digit code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-lg h-12 font-hand tracking-widest text-center bg-background"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="h-12 px-6 text-base font-semibold bg-secondary hover:bg-secondary/90"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Join
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-3 text-muted-foreground font-hand text-base">or</span>
              </div>
            </div>

            {/* Create Room */}
            <Button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Create New Room
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground font-hand">
          No account needed — just pick a name and play! 🎨
        </p>
      </div>
    </div>
  );
};

export default Index;
