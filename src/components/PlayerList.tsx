import { motion } from 'framer-motion';
import { FaCrown, FaUser, FaWifi, FaWifiSlash } from 'react-icons/fa';
import { Player } from '../types/game';

interface PlayerListProps {
  players: Player[];
  currentUserId?: string;
}

const PlayerList = ({ players, currentUserId }: PlayerListProps) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <FaUser className="mr-2" />
        Players ({players.length})
      </h3>
      
      <div className="space-y-3">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.id === currentUserId
                ? 'border-primary-300 bg-primary-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {player.isHost && (
                  <FaCrown className="text-yellow-500 text-lg" title="Host" />
                )}
                {player.isClueGiver && (
                  <div className="w-3 h-3 bg-purple-500 rounded-full" title="Clue Giver" />
                )}
                {player.isConnected ? (
                  <FaWifi className="text-green-500" title="Connected" />
                ) : (
                  <FaWifiSlash className="text-red-500" title="Disconnected" />
                )}
              </div>
              
              <div>
                <div className="font-medium text-gray-800">
                  {player.name}
                  {player.id === currentUserId && (
                    <span className="ml-2 text-sm text-primary-600">(You)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Score: {player.score} pts
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {player.teamId ? `Team ${player.teamId}` : 'No Team'}
              </div>
              {!player.isConnected && (
                <div className="text-xs text-red-500">
                  Last seen: {new Date(player.lastSeen).toLocaleTimeString()}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {players.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FaUser className="text-4xl mx-auto mb-4 opacity-50" />
          <p>No players yet</p>
          <p className="text-sm">Share the game code to invite friends!</p>
        </div>
      )}
    </div>
  );
};

export default PlayerList; 