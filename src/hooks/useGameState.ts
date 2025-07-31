import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameState, Player, User, GameSettings } from '../types/game';
import { auth, signInAsGuest, subscribeToGame, createGame, joinGame, startGame, submitClue, submitGuess } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface GameStore {
  // User state
  user: User | null;
  isLoading: boolean;
  
  // Game state
  currentGame: GameState | null;
  gameId: string | null;
  
  // UI state
  showJoinModal: boolean;
  showCreateModal: boolean;
  error: string | null;
  
  // Actions
  signIn: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  createNewGame: (settings: GameSettings) => Promise<string>;
  joinExistingGame: (gameId: string, playerName: string) => Promise<void>;
  startGameAction: () => Promise<void>;
  submitClueAction: (scaleId: string, clue: string) => Promise<void>;
  submitGuessAction: (value: number) => Promise<void>;
  
  // UI actions
  setShowJoinModal: (show: boolean) => void;
  setShowCreateModal: (show: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isLoading: true,
    currentGame: null,
    gameId: null,
    showJoinModal: false,
    showCreateModal: false,
    error: null,
    
    // Auth actions
    signIn: async (displayName: string) => {
      try {
        set({ isLoading: true, error: null });
        const firebaseUser = await signInAsGuest(displayName);
        
        const user: User = {
          id: firebaseUser.uid,
          name: displayName,
          isAnonymous: true,
          lastSeen: Date.now()
        };
        
        set({ user, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to sign in',
          isLoading: false 
        });
      }
    },
    
    signOut: async () => {
      try {
        await auth.signOut();
        set({ 
          user: null, 
          currentGame: null, 
          gameId: null,
          showJoinModal: false,
          showCreateModal: false,
          error: null
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to sign out'
        });
      }
    },
    
    // Game actions
    createNewGame: async (settings: GameSettings) => {
      const { user } = get();
      if (!user) throw new Error('User not authenticated');
      
      try {
        set({ isLoading: true, error: null });
        const gameId = await createGame(user.id, user.name, settings);
        set({ gameId, isLoading: false });
        return gameId;
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create game',
          isLoading: false 
        });
        throw error;
      }
    },
    
    joinExistingGame: async (gameId: string, playerName: string) => {
      const { user } = get();
      if (!user) throw new Error('User not authenticated');
      
      try {
        set({ isLoading: true, error: null });
        await joinGame(gameId, user.id, playerName);
        set({ gameId, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to join game',
          isLoading: false 
        });
        throw error;
      }
    },
    
    startGameAction: async () => {
      const { gameId } = get();
      if (!gameId) throw new Error('No active game');
      
      try {
        set({ isLoading: true, error: null });
        await startGame(gameId);
        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to start game',
          isLoading: false 
        });
      }
    },
    
    submitClueAction: async (scaleId: string, clue: string) => {
      const { gameId, user } = get();
      if (!gameId || !user) throw new Error('No active game or user');
      
      try {
        await submitClue(gameId, user.id, scaleId, clue);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to submit clue'
        });
      }
    },
    
    submitGuessAction: async (value: number) => {
      const { gameId, user } = get();
      if (!gameId || !user) throw new Error('No active game or user');
      
      try {
        await submitGuess(gameId, user.id, value);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to submit guess'
        });
      }
    },
    
    // UI actions
    setShowJoinModal: (show: boolean) => set({ showJoinModal: show }),
    setShowCreateModal: (show: boolean) => set({ showCreateModal: show }),
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
  }))
);

// Initialize auth listener
onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    const user: User = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous',
      isAnonymous: firebaseUser.isAnonymous,
      lastSeen: Date.now()
    };
    useGameStore.setState({ user, isLoading: false });
  } else {
    useGameStore.setState({ user: null, isLoading: false });
  }
});

// Subscribe to game updates when gameId changes
useGameStore.subscribe(
  (state) => state.gameId,
  (gameId) => {
    if (gameId) {
      const unsubscribe = subscribeToGame(gameId, (gameState) => {
        useGameStore.setState({ currentGame: gameState });
      });
      
      // Cleanup subscription when component unmounts
      return unsubscribe;
    }
  }
);

// Selectors for common state access
export const useUser = () => useGameStore((state) => state.user);
export const useCurrentGame = () => useGameStore((state) => state.currentGame);
export const useGameId = () => useGameStore((state) => state.gameId);
export const useIsLoading = () => useGameStore((state) => state.isLoading);
export const useError = () => useGameStore((state) => state.error);

// Helper selectors
export const useIsHost = () => {
  const user = useUser();
  const currentGame = useCurrentGame();
  
  if (!user || !currentGame) return false;
  return currentGame.players.some(player => 
    player.id === user.id && player.isHost
  );
};

export const useIsClueGiver = () => {
  const user = useUser();
  const currentGame = useCurrentGame();
  
  if (!user || !currentGame?.currentRound) return false;
  return currentGame.currentRound.clueGiverId === user.id;
};

export const useCurrentPlayer = () => {
  const user = useUser();
  const currentGame = useCurrentGame();
  
  if (!user || !currentGame) return null;
  return currentGame.players.find(player => player.id === user.id) || null;
}; 