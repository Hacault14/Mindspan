import { Guess, Scale, Player } from '../types/game';

export interface ScoreResult {
  playerId: string;
  score: number;
  accuracy: number; // 0-1
  bonus: number;
}

export interface ClueGiverScore {
  playerId: string;
  score: number;
  averageAccuracy: number;
  clusteringBonus: number;
}

export const calculatePlayerScore = (guess: Guess, scale: Scale): ScoreResult => {
  const accuracy = Math.abs(guess.value - scale.targetValue) / 100;
  const distance = Math.abs(guess.value - scale.targetValue);
  
  let score = 0;
  
  // Scoring based on proximity
  if (distance <= 5) {
    score = 100;
  } else if (distance <= 10) {
    score = 80;
  } else if (distance <= 15) {
    score = 60;
  } else if (distance <= 20) {
    score = 40;
  } else if (distance <= 30) {
    score = 20;
  } else {
    score = 0;
  }
  
  return {
    playerId: guess.playerId,
    score,
    accuracy: 1 - accuracy,
    bonus: 0
  };
};

export const calculateClueGiverScore = (
  guesses: Guess[], 
  scale: Scale, 
  clueGiverId: string
): ClueGiverScore => {
  if (guesses.length === 0) {
    return {
      playerId: clueGiverId,
      score: 0,
      averageAccuracy: 0,
      clusteringBonus: 0
    };
  }
  
  // Calculate average accuracy of all guesses
  const accuracies = guesses.map(guess => {
    const distance = Math.abs(guess.value - scale.targetValue);
    return Math.max(0, 1 - (distance / 100));
  });
  
  const averageAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  
  // Base score based on average accuracy
  const baseScore = Math.round(averageAccuracy * 100);
  
  // Clustering bonus: if guesses are close together near the target
  const targetGuesses = guesses.filter(guess => 
    Math.abs(guess.value - scale.targetValue) <= 20
  );
  
  let clusteringBonus = 0;
  if (targetGuesses.length >= 2) {
    // Calculate how clustered the good guesses are
    const goodGuessValues = targetGuesses.map(g => g.value).sort((a, b) => a - b);
    const maxSpread = Math.max(...goodGuessValues) - Math.min(...goodGuessValues);
    
    // Bonus for tight clustering (smaller spread = higher bonus)
    if (maxSpread <= 10) {
      clusteringBonus = 50;
    } else if (maxSpread <= 20) {
      clusteringBonus = 25;
    }
  }
  
  return {
    playerId: clueGiverId,
    score: baseScore + clusteringBonus,
    averageAccuracy,
    clusteringBonus
  };
};

export const calculateRoundScores = (
  guesses: Guess[], 
  scales: Scale[], 
  players: Player[],
  clueGiverId: string
): Record<string, number> => {
  const scores: Record<string, number> = {};
  
  // Initialize scores
  players.forEach(player => {
    scores[player.id] = 0;
  });
  
  // Calculate scores for each scale
  scales.forEach(scale => {
    const scaleGuesses = guesses.filter(guess => 
      guesses.indexOf(guess) < scales.length // Simple mapping for now
    );
    
    // Player scores
    scaleGuesses.forEach(guess => {
      const result = calculatePlayerScore(guess, scale);
      scores[guess.playerId] += result.score;
    });
    
    // Clue giver score
    if (scaleGuesses.length > 0 && clueGiverId) {
      const clueGiverScore = calculateClueGiverScore(scaleGuesses, scale, clueGiverId);
      scores[clueGiverScore.playerId] += clueGiverScore.score;
    }
  });
  
  return scores;
};

export const calculateTeamScores = (
  playerScores: Record<string, number>,
  teams: { id: string; players: string[] }[]
): Record<string, number> => {
  const teamScores: Record<string, number> = {};
  
  teams.forEach(team => {
    teamScores[team.id] = team.players.reduce((sum, playerId) => {
      return sum + (playerScores[playerId] || 0);
    }, 0);
  });
  
  return teamScores;
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export const getScoreEmoji = (score: number): string => {
  if (score >= 80) return '🎯';
  if (score >= 60) return '👍';
  if (score >= 40) return '😐';
  if (score >= 20) return '😕';
  return '😢';
}; 