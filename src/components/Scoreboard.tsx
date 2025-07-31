import { motion } from 'framer-motion';
import { FaTrophy, FaMedal, FaAward } from 'react-icons/fa';
import { Player } from '../types/game';

interface ScoreboardProps {
  players: Player[];
  currentUserId?: string;
}

const Scoreboard = ({ players, currentUserId }: ScoreboardProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <FaTrophy className="text-yellow-500 text-lg" />;
      case 1:
        return <FaMedal className="text-gray-400 text-lg" />;
      case 2:
        return <FaAward className="text-amber-600 text-lg" />;
      default:
        return <span className="text-gray-400 font-bold">{index + 1}</span>;
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <FaTrophy className="mr-2" />
        Scoreboard
      </h3>
      
      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.id === currentUserId
                ? 'border-primary-300 bg-primary-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-6 h-6">
                {getRankIcon(index)}
              </div>
              
              <div>
                <div className="font-medium text-gray-800">
                  {player.name}
                  {player.id === currentUserId && (
                    <span className="ml-2 text-sm text-primary-600">(You)</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {player.isHost && 'Host'}
                  {player.isClueGiver && ' • Clue Giver'}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-bold text-lg text-primary-600">
                {player.score}
              </div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {players.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FaTrophy className="text-4xl mx-auto mb-4 opacity-50" />
          <p>No scores yet</p>
        </div>
      )}
    </div>
  );
};

export default Scoreboard; 