import { create } from "zustand";

export interface Player {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  score: number;
  is_host: boolean;
  joined_at: string;
}

export interface Round {
  id: string;
  room_id: string;
  artist_id: string;
  secret_word: string;
  started_at: string;
  ended_at: string | null;
  correct_guesser_id: string | null;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  game_state: {
    status: "lobby" | "playing" | "round_end" | "game_over";
    current_round: number;
    total_rounds: number;
    category: string;
    word_list: string[];
    artist_id?: string;
  };
  created_at: string;
  last_activity: string;
}

export interface ChatMessage {
  id: string;
  player_id: string;
  username: string;
  message: string;
  is_system: boolean;
  is_correct?: boolean;
  timestamp: number;
}

interface GameState {
  // Auth
  userId: string | null;
  username: string;
  setUserId: (id: string | null) => void;
  setUsername: (name: string) => void;

  // Room
  room: Room | null;
  players: Player[];
  currentPlayer: Player | null;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setCurrentPlayer: (player: Player | null) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;

  // Game
  currentRound: Round | null;
  secretWord: string | null;
  timeRemaining: number;
  chatMessages: ChatMessage[];
  drawingStrokes: any[];
  setCurrentRound: (round: Round | null) => void;
  setSecretWord: (word: string | null) => void;
  setTimeRemaining: (time: number) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setDrawingStrokes: (strokes: any[]) => void;
  addDrawingStroke: (stroke: any) => void;

  // Reset
  resetGame: () => void;
  resetAll: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  userId: null,
  username: "",
  setUserId: (id) => set({ userId: id }),
  setUsername: (name) => set({ username: name }),

  room: null,
  players: [],
  currentPlayer: null,
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  updatePlayer: (id, updates) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  currentRound: null,
  secretWord: null,
  timeRemaining: 60,
  chatMessages: [],
  drawingStrokes: [],
  setCurrentRound: (round) => set({ currentRound: round }),
  setSecretWord: (word) => set({ secretWord: word }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  setDrawingStrokes: (strokes) => set({ drawingStrokes: strokes }),
  addDrawingStroke: (stroke) => set((state) => ({ drawingStrokes: [...state.drawingStrokes, stroke] })),

  resetGame: () =>
    set({
      currentRound: null,
      secretWord: null,
      timeRemaining: 60,
      chatMessages: [],
      drawingStrokes: [],
    }),
  resetAll: () =>
    set({
      room: null,
      players: [],
      currentPlayer: null,
      currentRound: null,
      secretWord: null,
      timeRemaining: 60,
      chatMessages: [],
      drawingStrokes: [],
    }),
}));
