import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GameState } from '../types/game';
import { startGame, startFirstRound } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { GameBoard } from '../components/GameBoard';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (gameId) {
      const setupGame = async () => {
        try {
          // Find game by short code
          const gamesRef = collection(db, 'games');
          const q = query(gamesRef, where('shortCode', '==', gameId.toUpperCase()));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const gameDoc = querySnapshot.docs[0];
            
            // Set up real-time listener first
            unsubscribe = onSnapshot(gameDoc.ref, (doc) => {
              if (doc.exists()) {
                setGame(doc.data() as GameState);
                setLoading(false);
              }
            }, (error) => {
              console.error('Firebase listener error:', error);
            });
          } else {
            toast.error('Game not found');
            setLoading(false);
          }
        } catch (error) {
          toast.error('Failed to load game');
          console.error('Load game error:', error);
          setLoading(false);
        }
      };
      
      setupGame();
    }
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [gameId]);

  useEffect(() => {
    // Get current user from Firebase auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    
    return () => unsubscribe();
  }, []);



  const handleStartGame = async () => {
    if (!gameId) return;
    
    try {
      await startGame(gameId);
      toast.success('Game started! All players can now submit their clues.');
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game. Please try again.');
    }
  };

  const handleStartFirstRound = async () => {
    if (!gameId) return;
    
    try {
      await startFirstRound(gameId);
      toast.success('First round started!');
    } catch (error) {
      console.error('Error starting first round:', error);
      toast.error('Failed to start first round. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Game Not Found</h1>
          <p className="text-gray-600 mb-6">The game you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Show active game interface (including clue submission phase)
  if (game.status === 'active' || game.status === 'clue-submission') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <GameBoard 
            game={game} 
            currentUser={currentUser} 
          />
        </div>
      </div>
    );
  }

  // Show lobby interface
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Game Lobby</h1>
              <p className="text-gray-600">Game Code: {gameId?.toUpperCase()}</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {game.players.length}/{game.settings.maxPlayers}
              </div>
              <div className="text-sm text-gray-500">Players</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player List */}
          <div className="lg:col-span-2">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Players ({game.players.length})</h3>
              
              <div className="space-y-3">
                {game.players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{player.name || 'Anonymous'}</span>
                      {player.isHost && <span className="text-yellow-600 text-sm">(Host)</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      Score: {player.score} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Settings</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mode:</span>
                  <span className="font-medium capitalize">{game.gameMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rounds:</span>
                  <span className="font-medium">{game.settings.roundsPerGame}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Clue Time:</span>
                  <span className="font-medium">{game.settings.clueTimeLimit}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guess Time:</span>
                  <span className="font-medium">{game.settings.guessingTimeLimit}s</span>
                </div>
              </div>
            </div>

            <div className="card">
              <button
                onClick={handleStartGame}
                disabled={starting || game.players.length < 2}
                className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                {starting ? 'Starting...' : 'Start Game'}
              </button>
              
              <p className="text-sm text-gray-500 mt-2 text-center">
                {game.players.length < 2 ? 'Need at least 2 players to start' : 'Ready to play!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage; 