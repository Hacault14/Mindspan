import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { signInAsGuest, createGame, joinGame } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const HomePage = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await signInAsGuest(nickname.trim());
      toast.success('Welcome to Mindspan!');
    } catch (error) {
      toast.error('Failed to sign in. Please try again.');
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGame = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setIsLoading(true);
    try {
      const gameId = await createGame(user.uid, user.displayName || 'Anonymous', {
        clueTimeLimit: 120,
        guessingTimeLimit: 60,
        roundsPerGame: 5,
        maxPlayers: 8,
        gameMode: 'free-for-all'
      });
      
      toast.success('Game created!');
      navigate(`/game/${gameId}`);
    } catch (error) {
      toast.error('Failed to create game. Please try again.');
      console.error('Create game error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameCode.trim()) {
      toast.error('Please enter a game code');
      return;
    }
    
    if (!user) {
      toast.error('Please sign in first');
      return;
    }
    
    setIsLoading(true);
    try {
      await joinGame(gameCode.trim(), user.uid, user.displayName || 'Anonymous');
      toast.success('Joined game!');
      navigate(`/game/${gameCode.trim()}`);
    } catch (error) {
      toast.error('Failed to join game. Check the game code.');
      console.error('Join game error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl">🎮</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Mindspan</h1>
            <p className="text-gray-600">A multiplayer party game of perception</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your nickname
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                className="input-field"
                maxLength={20}
                required
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Start Playing'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">How to play:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• One player gives a clue for a hidden target on a scale</li>
              <li>• Other players guess where the target is located</li>
              <li>• Score points based on how close your guess is</li>
              <li>• The clue giver gets bonus points for clustered correct guesses</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl">🎮</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Mindspan</h1>
          <p className="text-gray-600 mb-4">Welcome back, {user.displayName}!</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCreateGame}
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Creating...' : 'Create New Game'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleJoinGame} className="space-y-4">
            <div>
              <label htmlFor="gameCode" className="block text-sm font-medium text-gray-700 mb-2">
                Join with game code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="Enter game code"
                className="input-field text-center text-lg font-mono"
                maxLength={4}
                required
                disabled={isLoading}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-secondary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">How to play:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• One player gives a clue for a hidden target on a scale</li>
            <li>• Other players guess where the target is located</li>
            <li>• Score points based on how close your guess is</li>
            <li>• The clue giver gets bonus points for clustered correct guesses</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 