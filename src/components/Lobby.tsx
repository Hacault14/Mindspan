import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser, useIsHost, useGameStore } from '../hooks/useGameState';
import { toast } from 'react-hot-toast';
import { FaPlay, FaCopy, FaUsers, FaCog } from 'react-icons/fa';
import { GameState } from '../types/game';
import PlayerList from './PlayerList';

interface LobbyProps {
  game: GameState;
}

const Lobby = ({ game }: LobbyProps) => {
  const user = useUser();
  const isHost = useIsHost();
  const { startGameAction } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  const handleStartGame = async () => {
    if (!isHost) return;
    
    if (game.players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }
    
    try {
      await startGameAction();
      toast.success('Game starting!');
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(game.id);
    toast.success('Game code copied!');
  };

  const canStart = isHost && game.players.length >= 2;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Game Lobby</h1>
              <p className="text-gray-600">Waiting for players...</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {game.players.length}/{game.settings.maxPlayers}
                </div>
                <div className="text-sm text-gray-500">Players</div>
              </div>
              
              <button
                onClick={copyGameCode}
                className="btn-secondary flex items-center"
              >
                <FaCopy className="mr-2" />
                Copy Code
              </button>
              
              {isHost && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="btn-secondary"
                >
                  <FaCog />
                </button>
              )}
            </div>
          </div>
          
          {/* Game Code Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Share this code with friends:</p>
              <div className="text-3xl font-mono font-bold text-primary-600 tracking-wider">
                {game.id}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <PlayerList players={game.players} currentUserId={user?.id} />
          </motion.div>

          {/* Game Info & Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Game Settings */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FaCog className="mr-2" />
                Game Settings
              </h3>
              
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

            {/* Start Game Button */}
            {isHost && (
              <div className="card">
                <button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center ${
                    canStart
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FaPlay className="mr-2" />
                  {canStart ? 'Start Game' : 'Need More Players'}
                </button>
                
                {!canStart && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Need at least 2 players to start
                  </p>
                )}
              </div>
            )}

            {/* Game Instructions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">How to Play</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• One player gives a clue for a hidden target</p>
                <p>• Others guess where the target is located</p>
                <p>• Score points based on accuracy</p>
                <p>• Clue giver gets bonus for clustered guesses</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Lobby; 