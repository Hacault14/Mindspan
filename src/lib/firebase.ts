import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { GameState, Player, Round, User, Scale, Guess, SubmittedClue } from '../types/game';
import { calculateRoundScores } from './scoring';
import { firebaseConfig } from '../../config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth functions
export const signInAsGuest = async (displayName: string) => {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    // Update the Firebase user's displayName
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Create or update user document
    await setDoc(doc(db, 'users', user.uid), {
      displayName,
      lastSeen: serverTimestamp(),
      isAnonymous: true
    });
    
    return user;
  } catch (error) {
    console.error('Error signing in as guest:', error);
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper functions
const generateShortCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Game functions
export const createGame = async (hostId: string, hostName: string, settings: any): Promise<string> => {
  const shortCode = generateShortCode();
  
  const gameRef = await addDoc(collection(db, 'games'), {
    id: shortCode, // Add short code as a field
    status: 'lobby',
    players: [{
      id: hostId,
      name: hostName,
      isHost: true,
      isClueGiver: false,
      score: 0,
      isConnected: true,
      lastSeen: Date.now()
    }],
    teams: [],
    roundNumber: 0,
    totalRounds: settings.roundsPerGame || 5,
    gameMode: settings.gameMode || 'free-for-all',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settings: {
      clueTimeLimit: settings.clueTimeLimit || 120,
      guessingTimeLimit: settings.guessingTimeLimit || 60,
      roundsPerGame: settings.roundsPerGame || 5,
      maxPlayers: settings.maxPlayers || 8
    }
  });
  
  // Update the document with the short code
  await updateDoc(gameRef, {
    shortCode: shortCode
  });
  
  return shortCode; // Return the short code instead of the document ID
};

export const joinGame = async (gameCode: string, playerId: string, playerName: string) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  if (gameData.players.length >= gameData.settings.maxPlayers) {
    throw new Error('Game is full');
  }
  
  const newPlayer: Player = {
    id: playerId,
    name: playerName,
    isHost: false,
    isClueGiver: false,
    score: 0,
    isConnected: true,
    lastSeen: Date.now()
  };
  
  await updateDoc(gameDoc.ref, {
    players: [...gameData.players, newPlayer],
    updatedAt: serverTimestamp()
  });
};

export const subscribeToGame = (gameId: string, callback: (gameState: GameState | null) => void) => {
  const gameRef = doc(db, 'games', gameId);
  
  return onSnapshot(gameRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as GameState);
    } else {
      callback(null);
    }
  });
};

export const updatePlayerConnection = async (gameId: string, playerId: string, isConnected: boolean) => {
  const gameRef = doc(db, 'games', gameId);
  const gameDoc = await getDoc(gameRef);
  
  if (!gameDoc.exists()) return;
  
  const gameData = gameDoc.data() as GameState;
  const updatedPlayers = gameData.players.map(player => 
    player.id === playerId 
      ? { ...player, isConnected, lastSeen: Date.now() }
      : player
  );
  
  await updateDoc(gameRef, {
    players: updatedPlayers,
    updatedAt: serverTimestamp()
  });
};

export const submitClue = async (gameCode: string, playerId: string, scaleId: string, clue: string) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  // Create new submitted clue
  const newClue: SubmittedClue = {
    id: `clue-${Date.now()}-${Math.random()}`,
    playerId,
    playerName: gameData.players.find(p => p.id === playerId)?.name || 'Unknown',
    scaleId,
    clue,
    used: false
  };
  
  // Add clue to player's submitted clues
  const updatedPlayers = gameData.players.map(player => {
    if (player.id === playerId) {
      return {
        ...player,
        submittedClues: [...(player.submittedClues || []), newClue]
      };
    }
    return player;
  });
  
  await updateDoc(gameDoc.ref, {
    players: updatedPlayers,
    updatedAt: serverTimestamp()
  });
};

export const submitAllClues = async (gameCode: string, playerId: string, clues: { scaleId: string; clue: string; scale?: any }[]) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  // Create submitted clues for this player with the scales from the UI
  const submittedClues: SubmittedClue[] = clues.map((clue, index) => ({
    id: `clue-${Date.now()}-${playerId}-${index}`,
    playerId,
    playerName: gameData.players.find(p => p.id === playerId)?.name || 'Unknown',
    scaleId: clue.scaleId,
    clue: clue.clue,
    used: false,
    scale: clue.scale // Use the scale from the UI
  }));
  
  // Add clues to player's submitted clues
  const updatedPlayers = gameData.players.map(player => {
    if (player.id === playerId) {
      return {
        ...player,
        submittedClues: [...(player.submittedClues || []), ...submittedClues]
      };
    }
    return player;
  });
  
  // Check if all players have submitted their clues
  const cluesPerPlayer = gameData.cluesPerPlayer || 1;
  const allPlayersSubmitted = updatedPlayers.every(player => 
    player.submittedClues && player.submittedClues.length >= cluesPerPlayer
  );
  
  if (allPlayersSubmitted) {
    // All players have submitted, start the first round
    const firstRound = generateRoundWithRandomClue({ ...gameData, players: updatedPlayers }, 1);
    
    await updateDoc(gameDoc.ref, {
      players: updatedPlayers,
      status: 'active',
      roundNumber: 1,
      currentRound: firstRound,
      updatedAt: serverTimestamp()
    });
  } else {
    // Not all players have submitted yet
    await updateDoc(gameDoc.ref, {
      players: updatedPlayers,
      updatedAt: serverTimestamp()
    });
  }
};

export const startGame = async (gameCode: string) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  if (gameData.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }
  
  // Calculate clues per player based on player count
  const cluesPerPlayer = calculateCluesPerPlayer(gameData.players.length);
  
  // Calculate total rounds: total clues = players * clues per player
  const totalRounds = gameData.players.length * cluesPerPlayer;
  
  // Generate semi-random player order for the game
  const playerOrder = generateSemiRandomPlayerOrder(gameData.players, cluesPerPlayer);
  
  await updateDoc(gameDoc.ref, {
    status: 'clue-submission', // New status for clue submission phase
    roundNumber: 0,
    totalRounds,
    cluesPerPlayer,
    playerOrder, // Store the semi-random player order
    clueSubmissionEndTime: Date.now() + (gameData.settings.clueTimeLimit * 1000 * cluesPerPlayer), // More time for multiple clues
    updatedAt: serverTimestamp()
  });
};

export const startFirstRound = async (gameCode: string) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  // Generate first round with random clue selection
  const firstRound = generateRoundWithRandomClue(gameData, 1);
  
  await updateDoc(gameDoc.ref, {
    status: 'active',
    roundNumber: 1,
    currentRound: firstRound,
    updatedAt: serverTimestamp()
  });
};

export const submitGuess = async (gameCode: string, playerId: string, value: number) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  if (!gameData.currentRound) {
    throw new Error('No active round');
  }
  
  // Check if player already submitted a guess
  const existingGuess = gameData.currentRound.guesses.find(g => g.playerId === playerId);
  if (existingGuess) {
    throw new Error('Already submitted a guess');
  }
  
  const newGuess: Guess = {
    playerId,
    value,
    timestamp: Date.now()
  };
  
  const updatedGuesses = [...gameData.currentRound.guesses, newGuess];
  
  await updateDoc(gameDoc.ref, {
    'currentRound.guesses': updatedGuesses,
    updatedAt: serverTimestamp()
  });
};

export const endRound = async (gameCode: string) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  if (!gameData.currentRound) {
    throw new Error('No active round');
  }
  
  // Calculate scores for this round
  const roundScores = calculateRoundScores(
    gameData.currentRound.guesses,
    gameData.currentRound.scales,
    gameData.players,
    gameData.currentRound.clueGiverId
  );
  
  // Update player scores
  const updatedPlayers = gameData.players.map(player => ({
    ...player,
    score: player.score + (roundScores[player.id] || 0)
  }));
  
  // Check if this was the last round
  const isLastRound = gameData.roundNumber >= gameData.totalRounds;
  
  if (isLastRound) {
    // End the game
    await updateDoc(gameDoc.ref, {
      status: 'finished',
      players: updatedPlayers,
      'currentRound.scores': roundScores,
      'currentRound.isRevealPhase': true,
      updatedAt: serverTimestamp()
    });
  } else {
    // Mark the current round as reveal phase
    await updateDoc(gameDoc.ref, {
      players: updatedPlayers,
      'currentRound.scores': roundScores,
      'currentRound.isRevealPhase': true,
      updatedAt: serverTimestamp()
    });
  }
};

export const endRoundAndStartNext = async (gameCode: string) => {
  console.log('🔥 endRoundAndStartNext called with gameCode:', gameCode);
  
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    console.error('❌ Game not found for code:', gameCode);
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  console.log('📊 Current game state:', {
    roundNumber: gameData.roundNumber,
    totalRounds: gameData.totalRounds,
    status: gameData.status,
    currentRound: gameData.currentRound?.roundNumber,
    players: gameData.players.length,
    guesses: gameData.currentRound?.guesses?.length || 0
  });
  
  if (!gameData.currentRound) {
    console.error('❌ No active round found');
    throw new Error('No active round');
  }
  
  // Calculate scores for this round
  const roundScores = calculateRoundScores(
    gameData.currentRound.guesses,
    gameData.currentRound.scales,
    gameData.players,
    gameData.currentRound.clueGiverId
  );
  
  // Update player scores
  const updatedPlayers = gameData.players.map(player => ({
    ...player,
    score: player.score + (roundScores[player.id] || 0)
  }));
  
  // Check if this was the last round
  const isLastRound = gameData.roundNumber >= gameData.totalRounds;
  
  console.log('🎯 Round analysis:', {
    isLastRound,
    currentRoundNumber: gameData.roundNumber,
    totalRounds: gameData.totalRounds,
    roundScores
  });
  
  if (isLastRound) {
    console.log('🏁 Ending game - last round completed');
    // End the game
    await updateDoc(gameDoc.ref, {
      status: 'finished',
      players: updatedPlayers,
      'currentRound.scores': roundScores,
      'currentRound.isRevealPhase': true,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Game ended successfully');
  } else {
    console.log('🔄 Starting next round...');
    // Generate next round with random clue selection
    let nextRound;
    try {
      nextRound = generateRoundWithRandomClue({ ...gameData, players: updatedPlayers }, gameData.roundNumber + 1);
    } catch (error: any) {
      if (error?.message === 'No more unused clues available') {
        console.log('🏁 Ending game early - no more clues available');
        // End the game early
        await updateDoc(gameDoc.ref, {
          status: 'finished',
          players: updatedPlayers,
          'currentRound.scores': roundScores,
          'currentRound.isRevealPhase': true,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Game ended early due to insufficient clues');
        return;
      }
      throw error;
    }
    
    console.log('📝 Generated next round:', {
      roundNumber: nextRound.roundNumber,
      clueGiver: nextRound.clueGiverName,
      clue: nextRound.scales[0]?.clue,
      scale: `${nextRound.scales[0]?.leftLabel} - ${nextRound.scales[0]?.rightLabel}`,
      usedClueId: nextRound.usedClue?.id
    });
    
    // Update players with marked clues
    const finalUpdatedPlayers = updatedPlayers.map(player => ({
      ...player,
      submittedClues: player.submittedClues?.map(clue => {
        if (clue.id === nextRound.usedClue?.id) {
          console.log('✅ Marking clue as used:', {
            clueId: clue.id,
            clue: clue.clue,
            player: clue.playerName,
            roundUsed: gameData.roundNumber + 1
          });
          return { ...clue, used: true, roundUsed: gameData.roundNumber + 1 };
        }
        return clue;
      })
    }));
    
    // Start the next round immediately
    await updateDoc(gameDoc.ref, {
      currentRound: nextRound,
      roundNumber: gameData.roundNumber + 1,
      players: finalUpdatedPlayers,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Next round started successfully');
  }
};

export const startNextRound = async (gameCode: string) => {
  // Find game by short code
  const gamesRef = collection(db, 'games');
  const q = query(gamesRef, where('shortCode', '==', gameCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Game not found');
  }
  
  const gameDoc = querySnapshot.docs[0];
  const gameData = gameDoc.data() as GameState;
  
  // Generate next round with random clue selection
  const nextRound = generateRoundWithRandomClue(gameData, gameData.roundNumber + 1);
  
  // Update players with marked clues
  const updatedPlayers = gameData.players.map(player => ({
    ...player,
    submittedClues: player.submittedClues?.map(clue => 
      clue.id === nextRound.usedClue?.id ? { ...clue, used: true, roundUsed: gameData.roundNumber + 1 } : clue
    )
  }));
  
  await updateDoc(gameDoc.ref, {
    currentRound: nextRound,
    roundNumber: gameData.roundNumber + 1,
    players: updatedPlayers,
    updatedAt: serverTimestamp()
  });
};

// Helper functions
const calculateCluesPerPlayer = (playerCount: number): number => {
  if (playerCount <= 3) return 3;
  if (playerCount <= 5) return 2;
  return 1;
};

const generateSemiRandomPlayerOrder = (players: any[], cluesPerPlayer: number): string[] => {
  // Create a semi-random order where each player appears exactly cluesPerPlayer times
  // The order is randomized but ensures fair distribution and NO consecutive same player
  const playerOrder: string[] = [];
  
  // Create a deterministic seed based on player IDs and count
  const seed = players.map(p => p.id).sort().join('') + cluesPerPlayer;
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue += seed.charCodeAt(i);
  }
  
  // Simple deterministic shuffle function
  const deterministicShuffle = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      const j = Math.floor((seedValue / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Generate the complete order ensuring no consecutive same player
  const totalRounds = players.length * cluesPerPlayer;
  let lastPlayerId: string | null = null;
  
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    // Get all available players (excluding the last player to avoid consecutive)
    const availablePlayers = players.map(p => p.id).filter(id => id !== lastPlayerId);
    
    // If no players available (shouldn't happen), use all players
    if (availablePlayers.length === 0) {
      availablePlayers.push(...players.map(p => p.id));
    }
    
    // Shuffle available players deterministically
    const shuffledAvailable = deterministicShuffle(availablePlayers);
    
    // Select the first player from shuffled list
    const selectedPlayerId = shuffledAvailable[0];
    playerOrder.push(selectedPlayerId);
    
    // Update last player for next iteration
    lastPlayerId = selectedPlayerId;
  }
  
  // Log with player names for readability
  const playerOrderWithNames = playerOrder.map(id => {
    const player = players.find(p => p.id === id);
    return `${player?.name || 'Unknown'} (${id})`;
  });
  
  console.log('🎲 Generated player order:', playerOrder);
  console.log('🎲 Player order with names:', playerOrderWithNames);
  return playerOrder;
};

const selectRandomUnusedClue = (gameState: GameState, avoidPlayerId?: string): SubmittedClue => {
  // Get all unused clues from all players, optionally avoiding a specific player
  const allUnusedClues: SubmittedClue[] = [];
  console.log('🔍 selectRandomUnusedClue called, avoiding player:', avoidPlayerId);
  
  gameState.players.forEach(player => {
    if (player.submittedClues && (!avoidPlayerId || player.id !== avoidPlayerId)) {
      const playerUnusedClues = player.submittedClues.filter(clue => !clue.used);
      console.log(`Player ${player.name} (${player.id}) has ${playerUnusedClues.length} unused clues`);
      allUnusedClues.push(...playerUnusedClues);
    } else if (player.submittedClues) {
      console.log(`Player ${player.name} (${player.id}) skipped due to avoidPlayerId`);
    }
  });
  
  console.log('📋 Total unused clues available (avoiding player):', allUnusedClues.length);
  
  if (allUnusedClues.length === 0) {
    // If we can't avoid the player, fall back to any unused clue
    if (avoidPlayerId) {
      console.log('⚠️ No other players have unused clues, falling back to any player');
      return selectRandomUnusedClue(gameState);
    }
    console.error('❌ No unused clues available!');
    throw new Error('No unused clues available');
  }
  
  // Select a random unused clue
  const randomIndex = Math.floor(Math.random() * allUnusedClues.length);
  return allUnusedClues[randomIndex];
};

const generateRoundWithRandomClue = (gameState: GameState, roundNumber: number): Round => {
  console.log('🎲 generateRoundWithRandomClue called for round:', roundNumber);
  
  // Use semi-random player order if available, otherwise fall back to random selection
  let selectedClue: SubmittedClue;
  
  if (gameState.playerOrder && gameState.playerOrder.length >= roundNumber) {
    // Use the predetermined player order for this round
    const expectedPlayerId = gameState.playerOrder[roundNumber - 1];
    const expectedPlayer = gameState.players.find(p => p.id === expectedPlayerId);
    
    console.log('🎲 Round', roundNumber, 'expected player:', expectedPlayerId, 'found:', expectedPlayer?.name);
    console.log('🎲 Full player order:', gameState.playerOrder);
    console.log('🎲 Available players:', gameState.players.map(p => ({ id: p.id, name: p.name })));
    
    if (expectedPlayer && expectedPlayer.submittedClues) {
      const unusedClues = expectedPlayer.submittedClues.filter(clue => !clue.used);
      console.log('📋 Player', expectedPlayer.name, 'has', unusedClues.length, 'unused clues out of', expectedPlayer.submittedClues.length, 'total');
      console.log('📋 Expected player clues:', expectedPlayer.submittedClues.map(c => ({ clue: c.clue, used: c.used, roundUsed: c.roundUsed })));
      
      if (unusedClues.length > 0) {
        // Select a random unused clue from the expected player
        const randomIndex = Math.floor(Math.random() * unusedClues.length);
        selectedClue = unusedClues[randomIndex];
        console.log('🎯 Using semi-random order - selected clue from expected player:', expectedPlayer.name);
      } else {
        // Check if we should end the game early due to insufficient clues
        const totalUnusedClues = gameState.players.reduce((total, player) => {
          return total + (player.submittedClues?.filter(clue => !clue.used).length || 0);
        }, 0);
        
        console.log('⚠️ Expected player has no unused clues. Total unused clues remaining:', totalUnusedClues);
        
        if (totalUnusedClues === 0) {
          console.log('🏁 No more unused clues available, ending game early');
          throw new Error('No more unused clues available');
        }
        
        // Fall back to random selection if no unused clues from expected player
        console.log('⚠️ No unused clues from expected player, falling back to random selection (avoiding same player)');
        console.log('⚠️ Expected player ID to avoid:', expectedPlayerId);
        selectedClue = selectRandomUnusedClue(gameState, expectedPlayerId);
        console.log('⚠️ Fallback selected player:', selectedClue.playerName, 'ID:', selectedClue.playerId);
      }
    } else {
      // Fall back to random selection
      console.log('⚠️ Expected player not found, falling back to random selection');
      selectedClue = selectRandomUnusedClue(gameState);
    }
  } else {
    // Fall back to random selection if no player order
    console.log('⚠️ No player order available, using random selection');
    selectedClue = selectRandomUnusedClue(gameState);
  }
  
  console.log('🎯 Selected clue:', {
    player: selectedClue.playerName,
    clue: selectedClue.clue,
    scaleId: selectedClue.scaleId,
    scale: selectedClue.scale,
    used: selectedClue.used,
    roundUsed: selectedClue.roundUsed
  });
  
  // Double-check that the selected clue is not already used
  if (selectedClue.used) {
    console.error('❌ Selected clue is already used! This should not happen.');
    throw new Error('Selected clue is already used');
  }
  
  // Use the scale from the selected clue - this should always exist
  if (!selectedClue.scale) {
    console.error('❌ Selected clue has no scale! This should not happen.');
    throw new Error('Selected clue has no associated scale');
  }
  
  const scale = selectedClue.scale;
  
  // Create the scale for this round using the original scale properties
  const roundScale = {
    id: scale.id,
    leftLabel: scale.leftLabel,
    rightLabel: scale.rightLabel,
    targetValue: scale.targetValue,
    clue: selectedClue.clue
  };
  
  console.log('🎯 Round scale created:', roundScale);
  
  return {
    id: `round-${roundNumber}`,
    roundNumber,
    clueGiverId: selectedClue.playerId,
    clueGiverName: selectedClue.playerName,
    scales: [roundScale],
    guesses: [],
    isCluePhase: false, // Skip clue phase since clue is already submitted
    isGuessingPhase: true,
    isRevealPhase: false,
    cluePhaseEndTime: Date.now(),
    guessingPhaseEndTime: Date.now() + (gameState.settings.guessingTimeLimit * 1000),
    scores: {},
    usedClue: selectedClue
  };
};

const generateRound = (gameState: GameState, roundNumber: number): Round => {
  const scales = generateScales(1); // Generate one scale for this round
  
  // Select clue giver (rotate through players)
  const clueGiverIndex = (roundNumber - 1) % gameState.players.length;
  const clueGiver = gameState.players[clueGiverIndex];
  
  return {
    id: `round-${roundNumber}`,
    roundNumber,
    clueGiverId: clueGiver.id,
    clueGiverName: clueGiver.name,
    scales,
    guesses: [],
    isCluePhase: true,
    isGuessingPhase: false,
    isRevealPhase: false,
    cluePhaseEndTime: Date.now() + (gameState.settings.clueTimeLimit * 1000),
    scores: {}
  };
};

const generatePlayerScales = (playerId: string, count: number): Scale[] => {
  const scalePairs = [
    { left: 'Hot', right: 'Cold' },
    { left: 'Sweet', right: 'Sour' },
    { left: 'Loud', right: 'Quiet' },
    { left: 'Fast', right: 'Slow' },
    { left: 'Big', right: 'Small' },
    { left: 'Soft', right: 'Hard' },
    { left: 'Light', right: 'Dark' },
    { left: 'Smooth', right: 'Rough' },
    { left: 'Wet', right: 'Dry' },
    { left: 'Old', right: 'New' },
    { left: 'Expensive', right: 'Cheap' },
    { left: 'Dangerous', right: 'Safe' },
    { left: 'Funny', right: 'Serious' },
    { left: 'Beautiful', right: 'Ugly' },
    { left: 'Strong', right: 'Weak' },
    { left: 'Clean', right: 'Dirty' },
    { left: 'Fresh', right: 'Stale' },
    { left: 'Sharp', right: 'Dull' },
    { left: 'Tight', right: 'Loose' },
    { left: 'Heavy', right: 'Light' },
    { left: 'Bright', right: 'Dim' },
    { left: 'Warm', right: 'Cool' },
    { left: 'Thick', right: 'Thin' },
    { left: 'Long', right: 'Short' },
    { left: 'Wide', right: 'Narrow' },
    { left: 'High', right: 'Low' },
    { left: 'Deep', right: 'Shallow' },
    { left: 'Rough', right: 'Smooth' },
    { left: 'Bumpy', right: 'Flat' },
    { left: 'Curved', right: 'Straight' },
    { left: 'Round', right: 'Square' },
    { left: 'Pointed', right: 'Blunt' },
    { left: 'Open', right: 'Closed' },
    { left: 'Full', right: 'Empty' },
    { left: 'Solid', right: 'Liquid' },
    { left: 'Firm', right: 'Soft' },
    { left: 'Stiff', right: 'Flexible' },
    { left: 'Tense', right: 'Relaxed' },
    { left: 'Active', right: 'Passive' },
    { left: 'Busy', right: 'Quiet' },
    { left: 'Crowded', right: 'Empty' },
    { left: 'Noisy', right: 'Silent' },
    { left: 'Chaotic', right: 'Orderly' },
    { left: 'Messy', right: 'Neat' },
    { left: 'Complex', right: 'Simple' },
    { left: 'Modern', right: 'Traditional' },
    { left: 'Fancy', right: 'Plain' },
    { left: 'Elegant', right: 'Clumsy' },
    { left: 'Graceful', right: 'Awkward' },
    { left: 'Confident', right: 'Shy' },
    { left: 'Bold', right: 'Timid' },
    { left: 'Brave', right: 'Cowardly' },
    { left: 'Honest', right: 'Dishonest' },
    { left: 'Trustworthy', right: 'Suspicious' },
    { left: 'Friendly', right: 'Hostile' },
    { left: 'Kind', right: 'Mean' },
    { left: 'Generous', right: 'Selfish' },
    { left: 'Patient', right: 'Impatient' },
    { left: 'Calm', right: 'Anxious' },
    { left: 'Happy', right: 'Sad' },
    { left: 'Excited', right: 'Bored' },
    { left: 'Energetic', right: 'Tired' },
    { left: 'Awake', right: 'Sleepy' },
    { left: 'Hungry', right: 'Full' },
    { left: 'Thirsty', right: 'Satisfied' },
    { left: 'Comfortable', right: 'Uncomfortable' },
    { left: 'Cozy', right: 'Unwelcoming' },
    { left: 'Inviting', right: 'Repelling' },
    { left: 'Attractive', right: 'Repulsive' },
    { left: 'Pleasant', right: 'Unpleasant' },
    { left: 'Delicious', right: 'Disgusting' },
    { left: 'Tasty', right: 'Bland' },
    { left: 'Spicy', right: 'Mild' },
    { left: 'Rich', right: 'Poor' },
    { left: 'Luxurious', right: 'Basic' },
    { left: 'Premium', right: 'Budget' },
    { left: 'Rare', right: 'Common' },
    { left: 'Special', right: 'Ordinary' },
    { left: 'Unique', right: 'Generic' },
    { left: 'Original', right: 'Copy' },
    { left: 'Creative', right: 'Unimaginative' },
    { left: 'Innovative', right: 'Conventional' },
    { left: 'Progressive', right: 'Conservative' },
    { left: 'Liberal', right: 'Strict' },
    { left: 'Flexible', right: 'Rigid' },
    { left: 'Adaptable', right: 'Inflexible' },
    { left: 'Versatile', right: 'Limited' },
    { left: 'Skilled', right: 'Unskilled' },
    { left: 'Experienced', right: 'Novice' },
    { left: 'Expert', right: 'Amateur' },
    { left: 'Professional', right: 'Amateur' },
    { left: 'Mature', right: 'Immature' },
    { left: 'Wise', right: 'Foolish' },
    { left: 'Smart', right: 'Dumb' },
    { left: 'Intelligent', right: 'Stupid' },
    { left: 'Clever', right: 'Silly' },
    { left: 'Logical', right: 'Illogical' },
    { left: 'Rational', right: 'Irrational' },
    { left: 'Sensible', right: 'Absurd' },
    { left: 'Practical', right: 'Impractical' },
    { left: 'Useful', right: 'Useless' },
    { left: 'Helpful', right: 'Harmful' },
    { left: 'Beneficial', right: 'Harmful' },
    { left: 'Positive', right: 'Negative' },
    { left: 'Good', right: 'Bad' },
    { left: 'Right', right: 'Wrong' },
    { left: 'Correct', right: 'Incorrect' },
    { left: 'Accurate', right: 'Inaccurate' },
    { left: 'Precise', right: 'Vague' },
    { left: 'Specific', right: 'General' },
    { left: 'Detailed', right: 'Brief' },
    { left: 'Complete', right: 'Incomplete' },
    { left: 'Finished', right: 'Unfinished' },
    { left: 'Ready', right: 'Unready' },
    { left: 'Prepared', right: 'Unprepared' },
    { left: 'Organized', right: 'Disorganized' },
    { left: 'Structured', right: 'Random' },
    { left: 'Systematic', right: 'Chaotic' },
    { left: 'Orderly', right: 'Messy' },
    { left: 'Tidy', right: 'Untidy' },
    { left: 'Pure', right: 'Impure' },
    { left: 'Natural', right: 'Artificial' },
    { left: 'Organic', right: 'Synthetic' },
    { left: 'Real', right: 'Fake' },
    { left: 'Authentic', right: 'Fake' },
    { left: 'Genuine', right: 'Counterfeit' },
    { left: 'Sincere', right: 'Insincere' },
    { left: 'Truthful', right: 'Lying' },
    { left: 'Direct', right: 'Indirect' },
    { left: 'Straightforward', right: 'Evasive' },
    { left: 'Clear', right: 'Confusing' },
    { left: 'Obvious', right: 'Subtle' },
    { left: 'Visible', right: 'Hidden' },
    { left: 'Transparent', right: 'Opaque' },
    { left: 'Public', right: 'Private' },
    { left: 'Social', right: 'Solitary' },
    { left: 'Outgoing', right: 'Introverted' },
    { left: 'Extroverted', right: 'Shy' },
    { left: 'Talkative', right: 'Quiet' },
    { left: 'Expressive', right: 'Reserved' },
    { left: 'Emotional', right: 'Unemotional' },
    { left: 'Passionate', right: 'Apathetic' },
    { left: 'Enthusiastic', right: 'Unenthusiastic' },
    { left: 'Motivated', right: 'Unmotivated' },
    { left: 'Driven', right: 'Lazy' },
    { left: 'Ambitious', right: 'Unambitious' },
    { left: 'Goal-oriented', right: 'Aimless' },
    { left: 'Focused', right: 'Distracted' },
    { left: 'Concentrated', right: 'Scattered' },
    { left: 'Determined', right: 'Indecisive' },
    { left: 'Decisive', right: 'Hesitant' },
    { left: 'Confident', right: 'Uncertain' },
    { left: 'Sure', right: 'Unsure' },
    { left: 'Certain', right: 'Doubtful' },
    { left: 'Convinced', right: 'Skeptical' },
    { left: 'Trusting', right: 'Suspicious' },
    { left: 'Optimistic', right: 'Pessimistic' },
    { left: 'Hopeful', right: 'Hopeless' },
    { left: 'Cheerful', right: 'Gloomy' },
    { left: 'Joyful', right: 'Miserable' },
    { left: 'Delighted', right: 'Disappointed' },
    { left: 'Satisfied', right: 'Dissatisfied' },
    { left: 'Content', right: 'Discontent' },
    { left: 'Grateful', right: 'Ungrateful' },
    { left: 'Appreciative', right: 'Unappreciative' },
    { left: 'Respectful', right: 'Disrespectful' },
    { left: 'Polite', right: 'Rude' },
    { left: 'Courteous', right: 'Impolite' },
    { left: 'Mannerly', right: 'Unmannerly' },
    { left: 'Civil', right: 'Uncivil' },
    { left: 'Gentle', right: 'Harsh' },
    { left: 'Tender', right: 'Rough' },
    { left: 'Delicate', right: 'Sturdy' },
    { left: 'Fragile', right: 'Robust' },
    { left: 'Sensitive', right: 'Insensitive' },
    { left: 'Responsive', right: 'Unresponsive' },
    { left: 'Reactive', right: 'Unreactive' },
    { left: 'Dynamic', right: 'Static' },
    { left: 'Changing', right: 'Stable' },
    { left: 'Variable', right: 'Constant' },
    { left: 'Flexible', right: 'Fixed' },
    { left: 'Adaptable', right: 'Rigid' },
    { left: 'Versatile', right: 'Specialized' },
    { left: 'Multipurpose', right: 'Single-purpose' },
    { left: 'Universal', right: 'Specific' },
    { left: 'General', right: 'Particular' },
    { left: 'Broad', right: 'Narrow' },
    { left: 'Extensive', right: 'Minimal' },
    { left: 'Comprehensive', right: 'Incomplete' },
    { left: 'Thorough', right: 'Superficial' },
    { left: 'Profound', right: 'Shallow' },
    { left: 'Meaningful', right: 'Meaningless' },
    { left: 'Significant', right: 'Insignificant' },
    { left: 'Important', right: 'Unimportant' },
    { left: 'Essential', right: 'Optional' },
    { left: 'Necessary', right: 'Unnecessary' },
    { left: 'Required', right: 'Optional' },
    { left: 'Mandatory', right: 'Voluntary' },
    { left: 'Compulsory', right: 'Elective' },
    { left: 'Forced', right: 'Chosen' },
    { left: 'Automatic', right: 'Manual' },
    { left: 'Mechanical', right: 'Human' },
    { left: 'Robotic', right: 'Natural' },
    { left: 'Artificial', right: 'Organic' },
    { left: 'Synthetic', right: 'Natural' },
    { left: 'Man-made', right: 'Natural' },
    { left: 'Manufactured', right: 'Raw' },
    { left: 'Processed', right: 'Unprocessed' },
    { left: 'Refined', right: 'Crude' },
    { left: 'Sophisticated', right: 'Simple' },
    { left: 'Advanced', right: 'Basic' },
    { left: 'Complex', right: 'Simple' },
    { left: 'Complicated', right: 'Straightforward' },
    { left: 'Intricate', right: 'Simple' },
    { left: 'Detailed', right: 'Basic' },
    { left: 'Elaborate', right: 'Simple' },
    { left: 'Ornate', right: 'Plain' },
    { left: 'Decorative', right: 'Functional' },
    { left: 'Aesthetic', right: 'Practical' },
    { left: 'Attractive', right: 'Practical' },
    { left: 'Pleasant', right: 'Useful' },
    { left: 'Enjoyable', right: 'Effective' },
    { left: 'Fun', right: 'Serious' },
    { left: 'Entertaining', right: 'Educational' },
    { left: 'Amusing', right: 'Informative' },
    { left: 'Humorous', right: 'Factual' },
    { left: 'Witty', right: 'Serious' },
    { left: 'Clever', right: 'Straightforward' },
    { left: 'Smart', right: 'Simple' },
    { left: 'Intelligent', right: 'Basic' },
    { left: 'Brilliant', right: 'Average' },
    { left: 'Genius', right: 'Ordinary' },
    { left: 'Exceptional', right: 'Normal' },
    { left: 'Extraordinary', right: 'Regular' },
    { left: 'Remarkable', right: 'Unremarkable' },
    { left: 'Notable', right: 'Unnotable' },
    { left: 'Memorable', right: 'Forgettable' },
    { left: 'Impressive', right: 'Unimpressive' },
    { left: 'Striking', right: 'Unremarkable' },
    { left: 'Dramatic', right: 'Subtle' },
    { left: 'Vivid', right: 'Dull' },
    { left: 'Bright', right: 'Muted' },
    { left: 'Vibrant', right: 'Pale' },
    { left: 'Colorful', right: 'Monochrome' },
    { left: 'Rich', right: 'Poor' },
    { left: 'Luxurious', right: 'Basic' },
    { left: 'Elegant', right: 'Plain' },
    { left: 'Sophisticated', right: 'Simple' },
    { left: 'Refined', right: 'Crude' },
    { left: 'Polished', right: 'Rough' },
    { left: 'Smooth', right: 'Bumpy' },
    { left: 'Even', right: 'Uneven' },
    { left: 'Level', right: 'Sloped' },
    { left: 'Flat', right: 'Hilly' },
    { left: 'Straight', right: 'Curved' },
    { left: 'Linear', right: 'Circular' },
    { left: 'Direct', right: 'Indirect' },
    { left: 'Straightforward', right: 'Roundabout' },
    { left: 'Clear', right: 'Confusing' },
    { left: 'Obvious', right: 'Hidden' },
    { left: 'Visible', right: 'Invisible' },
    { left: 'Apparent', right: 'Hidden' },
    { left: 'Evident', right: 'Concealed' },
    { left: 'Blatant', right: 'Discreet' },
    { left: 'Overt', right: 'Covert' },
    { left: 'Public', right: 'Private' },
    { left: 'Open', right: 'Secret' },
    { left: 'Transparent', right: 'Opaque' },
    { left: 'Clear', right: 'Cloudy' },
    { left: 'Pure', right: 'Contaminated' },
    { left: 'Clean', right: 'Dirty' },
    { left: 'Fresh', right: 'Stale' },
    { left: 'New', right: 'Old' },
    { left: 'Young', right: 'Aged' },
    { left: 'Modern', right: 'Ancient' },
    { left: 'Contemporary', right: 'Historical' },
    { left: 'Current', right: 'Outdated' },
    { left: 'Relevant', right: 'Irrelevant' },
    { left: 'Timely', right: 'Untimely' },
    { left: 'Appropriate', right: 'Inappropriate' },
    { left: 'Suitable', right: 'Unsuitable' },
    { left: 'Fitting', right: 'Unfitting' },
    { left: 'Proper', right: 'Improper' },
    { left: 'Correct', right: 'Incorrect' },
    { left: 'Right', right: 'Wrong' },
    { left: 'Accurate', right: 'Inaccurate' },
    { left: 'Precise', right: 'Imprecise' },
    { left: 'Exact', right: 'Approximate' },
    { left: 'Specific', right: 'General' },
    { left: 'Detailed', right: 'Vague' },
    { left: 'Thorough', right: 'Superficial' },
    { left: 'Complete', right: 'Incomplete' },
    { left: 'Full', right: 'Partial' },
    { left: 'Whole', right: 'Broken' },
    { left: 'Intact', right: 'Damaged' },
    { left: 'Perfect', right: 'Flawed' },
    { left: 'Ideal', right: 'Imperfect' },
    { left: 'Excellent', right: 'Poor' },
    { left: 'Outstanding', right: 'Average' },
    { left: 'Superior', right: 'Inferior' },
    { left: 'Better', right: 'Worse' },
    { left: 'Good', right: 'Bad' },
    { left: 'Positive', right: 'Negative' },
    { left: 'Beneficial', right: 'Harmful' },
    { left: 'Helpful', right: 'Hurtful' },
    { left: 'Constructive', right: 'Destructive' },
    { left: 'Productive', right: 'Counterproductive' },
    { left: 'Effective', right: 'Ineffective' },
    { left: 'Efficient', right: 'Inefficient' },
    { left: 'Quick', right: 'Slow' },
    { left: 'Fast', right: 'Sluggish' },
    { left: 'Rapid', right: 'Gradual' },
    { left: 'Swift', right: 'Lazy' },
    { left: 'Agile', right: 'Clumsy' },
    { left: 'Nimble', right: 'Awkward' },
    { left: 'Graceful', right: 'Graceless' },
    { left: 'Elegant', right: 'Ungainly' },
    { left: 'Smooth', right: 'Jerky' },
    { left: 'Flexible', right: 'Rigid' },
    { left: 'Supple', right: 'Stiff' },
    { left: 'Loose', right: 'Tight' },
    { left: 'Relaxed', right: 'Tense' },
    { left: 'Calm', right: 'Anxious' },
    { left: 'Peaceful', right: 'Agitated' },
    { left: 'Serene', right: 'Turbulent' },
    { left: 'Quiet', right: 'Noisy' },
    { left: 'Silent', right: 'Loud' },
    { left: 'Still', right: 'Moving' },
    { left: 'Static', right: 'Dynamic' },
    { left: 'Stable', right: 'Unstable' },
    { left: 'Steady', right: 'Unsteady' },
    { left: 'Firm', right: 'Wobbly' },
    { left: 'Solid', right: 'Liquid' },
    { left: 'Hard', right: 'Soft' },
    { left: 'Tough', right: 'Tender' },
    { left: 'Powerful', right: 'Powerless' },
    { left: 'Mighty', right: 'Feeble' },
    { left: 'Robust', right: 'Fragile' },
    { left: 'Sturdy', right: 'Flimsy' },
    { left: 'Durable', right: 'Fragile' },
    { left: 'Reliable', right: 'Unreliable' },
    { left: 'Dependable', right: 'Undependable' },
    { left: 'Trustworthy', right: 'Untrustworthy' },
    { left: 'Faithful', right: 'Unfaithful' },
    { left: 'Loyal', right: 'Disloyal' },
    { left: 'Devoted', right: 'Uncommitted' },
    { left: 'Dedicated', right: 'Casual' },
    { left: 'Committed', right: 'Uncommitted' },
    { left: 'Serious', right: 'Casual' },
    { left: 'Focused', right: 'Distracted' },
    { left: 'Concentrated', right: 'Scattered' },
    { left: 'Attentive', right: 'Inattentive' },
    { left: 'Alert', right: 'Drowsy' },
    { left: 'Awake', right: 'Sleepy' },
    { left: 'Conscious', right: 'Unconscious' },
    { left: 'Aware', right: 'Unaware' },
    { left: 'Mindful', right: 'Mindless' },
    { left: 'Thoughtful', right: 'Thoughtless' },
    { left: 'Considerate', right: 'Inconsiderate' },
    { left: 'Caring', right: 'Uncaring' },
    { left: 'Kind', right: 'Unkind' },
    { left: 'Gentle', right: 'Harsh' },
    { left: 'Tender', right: 'Rough' },
    { left: 'Soft', right: 'Hard' },
    { left: 'Mild', right: 'Severe' },
    { left: 'Moderate', right: 'Extreme' },
    { left: 'Balanced', right: 'Unbalanced' },
    { left: 'Even', right: 'Uneven' },
    { left: 'Equal', right: 'Unequal' },
    { left: 'Fair', right: 'Unfair' },
    { left: 'Just', right: 'Unjust' },
    { left: 'Righteous', right: 'Wicked' },
    { left: 'Virtuous', right: 'Vicious' },
    { left: 'Moral', right: 'Immoral' },
    { left: 'Ethical', right: 'Unethical' },
    { left: 'Honest', right: 'Dishonest' },
    { left: 'Truthful', right: 'Lying' },
    { left: 'Sincere', right: 'Insincere' },
    { left: 'Genuine', right: 'Fake' },
    { left: 'Authentic', right: 'Counterfeit' },
    { left: 'Real', right: 'Fake' },
    { left: 'Natural', right: 'Artificial' },
    { left: 'Organic', right: 'Synthetic' },
    { left: 'Pure', right: 'Impure' },
    { left: 'Clean', right: 'Dirty' },
    { left: 'Fresh', right: 'Stale' },
    { left: 'New', right: 'Old' },
    { left: 'Young', right: 'Aged' },
    { left: 'Modern', right: 'Ancient' },
    { left: 'Contemporary', right: 'Historical' },
    { left: 'Current', right: 'Outdated' },
    { left: 'Relevant', right: 'Irrelevant' },
    { left: 'Timely', right: 'Untimely' },
    { left: 'Appropriate', right: 'Inappropriate' },
    { left: 'Suitable', right: 'Unsuitable' },
    { left: 'Fitting', right: 'Unfitting' },
    { left: 'Proper', right: 'Improper' },
    { left: 'Correct', right: 'Incorrect' },
    { left: 'Right', right: 'Wrong' },
    { left: 'Accurate', right: 'Inaccurate' },
    { left: 'Precise', right: 'Imprecise' },
    { left: 'Exact', right: 'Approximate' },
    { left: 'Specific', right: 'General' },
    { left: 'Detailed', right: 'Vague' },
    { left: 'Thorough', right: 'Superficial' },
    { left: 'Complete', right: 'Incomplete' },
    { left: 'Full', right: 'Partial' },
    { left: 'Whole', right: 'Broken' },
    { left: 'Intact', right: 'Damaged' },
    { left: 'Perfect', right: 'Flawed' },
    { left: 'Ideal', right: 'Imperfect' },
    { left: 'Excellent', right: 'Poor' },
    { left: 'Outstanding', right: 'Average' },
    { left: 'Superior', right: 'Inferior' },
    { left: 'Better', right: 'Worse' },
    { left: 'Good', right: 'Bad' },
    { left: 'Positive', right: 'Negative' },
    { left: 'Beneficial', right: 'Harmful' },
    { left: 'Hot', right: 'Cold' }
  ];
  
  const scales = [];
  const usedPairs = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let pairIndex: number;
    let pair: { left: string; right: string };
    
    // Keep trying until we find an unused pair
    do {
      pairIndex = Math.floor(Math.random() * scalePairs.length);
      pair = scalePairs[pairIndex];
    } while (usedPairs.has(`${pair.left}-${pair.right}`) || usedPairs.has(`${pair.right}-${pair.left}`));
    
    // Mark this pair as used
    usedPairs.add(`${pair.left}-${pair.right}`);
    
    // Generate a random target value
    const targetValue = Math.random() * 100;
    
    scales.push({
      id: `scale-${playerId}-${i}-${Date.now()}-${Math.random()}`,
      leftLabel: pair.left,
      rightLabel: pair.right,
      targetValue: targetValue
    });
  }
  
  return scales;
};

const generateScales = (count: number): Scale[] => {
  const scalePairs = [
    { left: 'Hot', right: 'Cold' },
    { left: 'Sweet', right: 'Sour' },
    { left: 'Loud', right: 'Quiet' },
    { left: 'Fast', right: 'Slow' },
    { left: 'Big', right: 'Small' },
    { left: 'Soft', right: 'Hard' },
    { left: 'Light', right: 'Dark' },
    { left: 'Smooth', right: 'Rough' },
    { left: 'Wet', right: 'Dry' },
    { left: 'Old', right: 'New' },
    { left: 'Expensive', right: 'Cheap' },
    { left: 'Dangerous', right: 'Safe' },
    { left: 'Funny', right: 'Serious' },
    { left: 'Beautiful', right: 'Ugly' },
    { left: 'Strong', right: 'Weak' }
  ];
  
  const selectedPairs = [];
  const shuffled = [...scalePairs].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < count; i++) {
    const pair = shuffled[i % shuffled.length];
    selectedPairs.push({
      id: `scale-${Date.now()}-${i}`,
      leftLabel: pair.left,
      rightLabel: pair.right,
      targetValue: Math.random() * 100 // Random target between 0-100
    });
  }
  
  return selectedPairs;
};

export { auth, db }; 