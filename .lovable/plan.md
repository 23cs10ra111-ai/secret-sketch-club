

# 🎨 The Secret Sketch Club

A real-time multiplayer drawing and guessing party game where players join rooms, take turns drawing secret words, and race to guess correctly.

---

## Page 1: Home Page
- Fun, colorful landing with the game logo/title
- Username input field
- Two options: "Join Room" (enter 6-digit code) or "Create New Room" (generates a random code)
- Playful design with sketchy/hand-drawn aesthetic touches

## Page 2: Lobby
- Room code displayed prominently (copyable)
- List of connected players with host badge
- Pre-game chat for socializing
- Host-only controls: word category selector (Animals, Objects, Food, or All) and "Start Game" button
- Real-time player join/leave updates via Supabase Realtime

## Page 3: Game Screen
- **Top bar**: Room code, round number (e.g. "Round 2/5"), 60-second countdown timer with progress bar, compact score display
- **Main area (left)**: Drawing canvas (800×500)
  - Artist sees the secret word above the canvas
  - Artist gets drawing tools: black brush and a "Clear Canvas" button
  - Detectives see the drawing appear in real-time
- **Chat panel (right)**: 
  - Message list showing guesses and system messages (e.g. "Player X joined", "Round started!")
  - Input field disabled for the Artist
  - Correct guesses trigger a celebration animation and end the round
- **Leaderboard sidebar**: Players ranked by score

## Page 4: Round End Overlay
- Reveals the secret word
- Shows who guessed correctly (if anyone)
- Updated scores with point animations (+10 for guesser, +5 for artist)
- 5-second countdown to next round

## Page 5: Game Over Screen
- Final leaderboard with winner highlighted
- Confetti/celebration for the winner
- "Play Again" button (resets scores, same room) and "Leave Room" button

---

## Backend (Supabase)

### Database Tables
- **rooms**: id, code (6-digit), host_id, game_state (JSON: current round, word list, category), created_at, last_activity
- **players**: id, room_id, user_id, username, score, is_host, joined_at
- **rounds**: id, room_id, artist_id, secret_word, started_at, ended_at, correct_guesser_id

### Edge Functions
- **create-room**: Generate unique 6-digit code, create room, add host as player
- **join-room**: Validate room code, add player, broadcast join event
- **start-game**: Validate host, pick word list, start first round
- **start-round**: Select random word, assign next artist, broadcast round start
- **submit-guess**: Securely compare guess to secret word (server-side), award points if correct, broadcast result
- **end-round**: Handle timeout, reveal word, update scores

### Realtime Channels
- **room:{code}**: Game events (player join/leave, round start/end, chat messages, correct guesses)
- **drawing:{code}**: High-frequency stroke events (x, y, type) for smooth canvas sync

### Auth
- Anonymous sign-in via Supabase Auth — no signup required, just pick a username

---

## Game Flow Summary
1. Players join a room via code → land in Lobby
2. Host starts the game → Round 1 begins
3. One player is the Artist (sees secret word, draws on canvas)
4. Others are Detectives (see drawing live, type guesses in chat)
5. First correct guess = round ends (+10 guesser, +5 artist)
6. No guess in 60 seconds = round ends, no points
7. Roles rotate each round
8. After 5 rounds → Game Over, show winner, option to play again

## Word List (Default)
Elephant, Rocket, Pizza, Dog, Cat, House, Tree, Car, Sun, Moon — expandable by category

