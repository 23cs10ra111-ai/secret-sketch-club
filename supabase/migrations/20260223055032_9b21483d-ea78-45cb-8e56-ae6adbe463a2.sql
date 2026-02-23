
-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  game_state JSONB NOT NULL DEFAULT '{"status": "lobby", "current_round": 0, "total_rounds": 5, "category": "all", "word_list": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rounds table
CREATE TABLE public.rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  secret_word TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  correct_guesser_id UUID REFERENCES public.players(id) ON DELETE SET NULL
);

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

-- Rooms: anyone authenticated can read, create
CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Host can update room" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

-- Players: anyone can read players in a room, authenticated can join
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join rooms" ON public.players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update own record" ON public.players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Players can leave rooms" ON public.players FOR DELETE USING (auth.uid() = user_id);

-- Rounds: anyone in the room can read rounds
CREATE POLICY "Anyone can read rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rounds" ON public.rounds FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rounds" ON public.rounds FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable realtime for players table (for join/leave updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
