import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { submitGuess, endRound, endRoundAndStartNext, startNextRound } from '../lib/firebase';
import { GameState, Round, Guess } from '../types/game';
import { ClueSubmissionPhase } from './ClueSubmissionPhase';

interface GameBoardProps {
  game: GameState;
  currentUser: any;
}

export const GameBoard: React.FC<GameBoardProps> = ({ game, currentUser }) => {
  
  const [needlePosition, setNeedlePosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [endingRound, setEndingRound] = useState(false);
  const [startingNext, setStartingNext] = useState(false);
  const [autoEndScheduled, setAutoEndScheduled] = useState(false);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const handleEndRoundAndStartNextRef = useRef<() => Promise<void>>();

  const currentRound = game.currentRound;

  // Define all handler functions first to avoid dependency issues
  const handleEndRound = useCallback(async () => {
    setEndingRound(true);
    try {
      // Use shortCode if available, otherwise use id
      const gameCode = game.shortCode || game.id;
      await endRound(gameCode);
      toast.success('Round ended!');
    } catch (error) {
      console.error('End round error:', error);
      toast.error('Failed to end round');
    } finally {
      setEndingRound(false);
    }
  }, [game.id, game.shortCode]);

  const handleEndRoundAndStartNext = useCallback(async () => {
    console.log('🚀 handleEndRoundAndStartNext called');
    setEndingRound(true);
    try {
      const gameCode = game.shortCode || game.id;
      await endRoundAndStartNext(gameCode);
      console.log('✅ Next round started successfully');
      toast.success('Next round started!');
    } catch (error) {
      console.error('❌ End round and start next error:', error);
      toast.error('Failed to progress to next round');
    } finally {
      setEndingRound(false);
    }
  }, [game.id, game.shortCode]);

  // Store the function in a ref to avoid useEffect dependency issues
  handleEndRoundAndStartNextRef.current = handleEndRoundAndStartNext;

  const handleSubmitGuess = useCallback(async () => {
    if (!currentUser || currentUser?.uid === currentRound?.clueGiverId) return;

    try {
      const gameCode = game.shortCode || game.id;
      await submitGuess(gameCode, currentUser.uid, needlePosition);
      toast.success('Guess submitted!');
    } catch (error) {
      console.error('Error submitting guess:', error);
      toast.error('Failed to submit guess. Please try again.');
    }
  }, [currentUser, currentRound?.clueGiverId, game.id, game.shortCode, needlePosition]);

  const handleStartNextRound = useCallback(async () => {
    setStartingNext(true);
    try {
      const gameCode = game.shortCode || game.id;
      await startNextRound(gameCode);
      toast.success('Next round started!');
    } catch (error) {
      toast.error('Failed to start next round');
      console.error('Start next round error:', error);
    } finally {
      setStartingNext(false);
    }
  }, [game.id, game.shortCode]);

  // Helper functions - MUST be defined before mouse handlers
  const calculatePosition = (clientX: number, clientY: number) => {
    if (!gaugeRef.current) return 50;
    
    const rect = gaugeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height;
    
    const deltaX = clientX - centerX;
    const deltaY = centerY - clientY;
    
    let rawAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Debug logging removed for clean console
    
    // Based on visual position on the gauge (flipped Y-axis):
    // Top right area: deltaX > 0 && deltaY > 0 (right and below center)
    // Top left area: deltaX < 0 && deltaY > 0 (left and below center)
    // Bottom left area: deltaX < 0 && deltaY < 0 (left and above center)
    // Bottom right area: deltaX > 0 && deltaY < 0 (right and above center)
    
    // Bottom left: position 0 (fixed)
    if (deltaX < 0 && deltaY < 0) {
      return 0;
    }
    
    // Bottom right: position 100 (fixed)
    if (deltaX > 0 && deltaY < 0) {
      return 100;
    }
    
    // Top right: position 100 to 50 (smooth arc)
    if (deltaX > 0 && deltaY > 0) {
      // Calculate angle from 0° to 90° and map to 100-50
      const angle = Math.abs(rawAngle);
      const position = 100 - (angle / 90) * 50;
      return Math.max(50, Math.min(100, position));
    }
    
    // Top left: position 50 to 0 (smooth arc)
    if (deltaX < 0 && deltaY > 0) {
      // Calculate angle from 90° to 180° and map to 50-0
      const angle = Math.abs(rawAngle);
      const position = 50 - ((angle - 90) / 90) * 50;
      return Math.max(0, Math.min(50, position));
    }
    
    // Fallback
    return 50;
  };

  // Mouse event handlers - MUST be defined before useEffect hooks
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    e.stopPropagation(); // Stop event bubbling
    isDraggingRef.current = true;
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault(); // Prevent text selection during drag
    if (isDraggingRef.current) {
      const newPosition = calculatePosition(e.clientX, e.clientY);
      setNeedlePosition(newPosition);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Timer logic for guessing phase (only for display, not auto-end)
  useEffect(() => {
    if (currentRound?.isGuessingPhase && currentRound?.guessingPhaseEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, currentRound.guessingPhaseEndTime! - Date.now());
        setTimeLeft(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentRound?.isGuessingPhase, currentRound?.guessingPhaseEndTime]);

  // Reset auto-end flag when round changes
  useEffect(() => {
    if (currentRound?.roundNumber) {
      console.log('🔄 Round changed, resetting auto-end flag. Round number:', currentRound.roundNumber);
      setAutoEndScheduled(false);
    }
  }, [currentRound?.roundNumber]);

  // Simple auto-end logic - check when guesses change
  useEffect(() => {
    if (currentRound?.isGuessingPhase && !endingRound && !autoEndScheduled) {
      const guessers = game.players.filter(p => p.id !== currentRound.clueGiverId);
      const submittedGuessers = currentRound.guesses.map(g => g.playerId);
      const allGuessersSubmitted = guessers.every(g => submittedGuessers.includes(g.id));

      if (allGuessersSubmitted && guessers.length > 0) {
        console.log('🎯 All guessers submitted, calling auto-end directly');
        setAutoEndScheduled(true);
        
        // Call the function directly without any timer
        if (handleEndRoundAndStartNextRef.current) {
          handleEndRoundAndStartNextRef.current();
        }
      }
    }
  }, [currentRound?.guesses?.length, currentRound?.isGuessingPhase, endingRound, autoEndScheduled]);



  // Handle clue submission phase
  if (game.status === 'clue-submission') {
    return (
      <ClueSubmissionPhase
        game={game}
        currentUser={currentUser}
        onAllCluesSubmitted={() => {
          // This will be handled by the real-time listener
        }}
      />
    );
  }

  if (!currentRound) {
    return (
      <div className="card text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Loading Game...</h3>
        <p className="text-gray-600">Please wait while the game is being set up.</p>
      </div>
    );
  }

  const isClueGiver = currentUser?.uid === currentRound.clueGiverId;
  const hasSubmittedGuess = currentRound.guesses.some(g => g.playerId === currentUser?.uid);
  const isWaitingForGuesses = currentRound.isGuessingPhase && !hasSubmittedGuess && !isClueGiver;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Game finished state
  if (game.status === 'finished') {
    return (
      <div className="space-y-6">
        {/* Final Game Results */}
        <div className="card">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Complete!</h2>
            <p className="text-gray-600">Final results after {game.totalRounds} rounds</p>
          </div>

          {/* Final Leaderboard */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 text-center mb-4">Final Standings</h3>
            
            {game.players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => {
                const isWinner = index === 0;
                const isTied = index > 0 && player.score === game.players.sort((a, b) => b.score - a.score)[index - 1].score;
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isWinner 
                        ? 'bg-yellow-50 border-yellow-300' 
                        : isTied 
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isWinner 
                          ? 'bg-yellow-500 text-white' 
                          : isTied 
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}>
                        {isTied ? '=' : index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{player.name}</div>
                        {isWinner && (
                          <div className="text-sm text-yellow-600 font-medium">🏆 Winner!</div>
                        )}
                        {isTied && (
                          <div className="text-sm text-blue-600 font-medium">Tied</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">{player.score}</div>
                      <div className="text-sm text-gray-500">points</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Game Statistics */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Game Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Players</div>
              <div className="text-2xl font-bold text-blue-800">{game.players.length}</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Rounds</div>
              <div className="text-2xl font-bold text-green-800">{game.totalRounds}</div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Highest Score</div>
              <div className="text-2xl font-bold text-purple-800">
                {Math.max(...game.players.map(p => p.score))}
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Average Score</div>
              <div className="text-2xl font-bold text-orange-800">
                {Math.round(game.players.reduce((sum, p) => sum + p.score, 0) / game.players.length)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Play Again
          </button>
          
          <button
            onClick={() => {
              const results = `Mindspan Game Results\n\n${game.players
                .sort((a, b) => b.score - a.score)
                .map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts`)
                .join('\n')}\n\nTotal Rounds: ${game.totalRounds}`;
              navigator.clipboard.writeText(results);
              toast.success('Results copied to clipboard!');
            }}
            className="flex-1 py-3 px-6 bg-secondary-600 hover:bg-secondary-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Share Results
          </button>
        </div>
      </div>
    );
  }

  // Round reveal phase
  if (currentRound.isRevealPhase) {
    return (
      <div className="space-y-6">
        {/* Round Results */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Round {game.roundNumber} Results</h3>
          
          {/* Scale Information */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="text-lg font-semibold text-gray-800 bg-blue-100 px-3 py-1 rounded-lg">
                {currentRound.scales[0]?.leftLabel}
              </div>
              <div className="text-lg font-semibold text-gray-800 bg-purple-100 px-3 py-1 rounded-lg">
                {currentRound.scales[0]?.rightLabel}
              </div>
            </div>
            <div className="text-center text-sm text-gray-600">
              Clue: "{currentRound.scales[0]?.clue}" by {currentRound.clueGiverName}
            </div>
          </div>
          
          {/* Target and Guesses */}
          <div className="mb-6">
            <div className="text-center mb-4">
              <div className="text-lg font-medium text-gray-700">Target Value</div>
              <div className="text-3xl font-bold text-blue-600">{currentRound.scales[0].targetValue.toFixed(1)}</div>
            </div>
            
            <div className="space-y-3">
              {currentRound.guesses.map((guess) => {
                const player = game.players.find(p => p.id === guess.playerId);
                const distance = Math.abs(guess.value - currentRound.scales[0].targetValue);
                const score = currentRound.scores?.[guess.playerId] || 0;
                
                return (
                  <div key={guess.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">{player?.name}</div>
                      <div className="text-sm text-gray-600">Guessed: {guess.value.toFixed(1)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">{score} pts</div>
                      <div className="text-sm text-gray-500">{distance.toFixed(1)} away</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Next Round Info */}
          {game.roundNumber < game.totalRounds && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-center">
                <div className="text-lg font-medium text-blue-800 mb-2">Next Round</div>
                <div className="text-blue-700">
                  Round {game.roundNumber + 1} - Clue Giver: {' '}
                  <span className="font-semibold">
                    {game.players[(game.roundNumber) % game.players.length]?.name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <button
            onClick={handleStartNextRound}
            disabled={startingNext}
            className="py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {startingNext ? 'Starting...' : game.roundNumber < game.totalRounds ? 'Start Next Round' : 'End Game'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Round Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Round {game.roundNumber} of {game.totalRounds}</h3>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {game.currentRound?.clueGiverId && (
                <>
                  Clue Giver: <span className="font-medium">
                    {game.players.find(p => p.id === game.currentRound?.clueGiverId)?.name}
                  </span>
                </>
              )}
            </div>
            {currentRound.isGuessingPhase && (
              <div className="text-right mt-1">
                <div className="text-xl font-bold text-red-600">{formatTime(timeLeft)}</div>
                <div className="text-xs text-gray-500">Time remaining</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Round Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Clue Giver Rotation:</span>
            <span>{game.players.length} players</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {game.players.map((player, index) => {
              const roundsAsClueGiver = Math.floor((game.roundNumber - 1) / game.players.length) + 
                (index < (game.roundNumber - 1) % game.players.length ? 1 : 0);
              const isCurrentClueGiver = game.currentRound?.clueGiverId === player.id;
              
              return (
                <div 
                  key={player.id}
                  className={`p-2 rounded border ${
                    isCurrentClueGiver 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-800">{player.name}</div>
                  <div className="text-gray-600">
                    {roundsAsClueGiver} round{roundsAsClueGiver !== 1 ? 's' : ''} as clue giver
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Scoreboard */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Standings</h3>
        <div className="space-y-2">
          {game.players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => {
              const isLeading = index === 0;
              const isCurrentPlayer = player.id === currentUser?.uid;
              const isCurrentClueGiver = game.currentRound?.clueGiverId === player.id;
              const nextClueGiverRound = game.roundNumber + 1;
              const nextClueGiverIndex = (nextClueGiverRound - 1) % game.players.length;
              const isNextClueGiver = game.players[nextClueGiverIndex]?.id === player.id;
              
              return (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentPlayer 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isLeading 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-gray-400 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {player.name}
                        {isCurrentPlayer && <span className="text-primary-600 ml-2">(You)</span>}
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        {isLeading && (
                          <span className="text-yellow-600 font-medium">🏆 Leading</span>
                        )}
                        {isCurrentClueGiver && (
                          <span className="text-blue-600 font-medium">🎯 Current Clue Giver</span>
                        )}
                        {isNextClueGiver && game.status === 'active' && (
                          <span className="text-green-600 font-medium">⏭️ Next Clue Giver</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">{player.score}</div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Player Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Player Status</h3>
        <div className="space-y-2">
          {game.players.map((player) => {
            const isClueGiver = player.id === currentRound.clueGiverId;
            const hasSubmitted = currentRound.guesses.some(g => g.playerId === player.id);
            const isCurrentPlayer = player.id === currentUser?.uid;
            
            let status = '';
            if (isClueGiver) {
              status = '(Clue Giver)';
            } else if (hasSubmitted) {
              status = '✓ Submitted';
            } else if (currentRound.isGuessingPhase) {
              status = 'Waiting for guess';
            } else {
              status = 'Waiting for clue';
            }
            
            return (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentPlayer ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasSubmitted || isClueGiver ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                  }`}>
                    {hasSubmitted ? '✓' : isClueGiver ? '🎯' : '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {player.name}
                      {isCurrentPlayer && <span className="text-primary-600 ml-2">(You)</span>}
                    </div>
                    <div className="text-sm text-gray-500">{status}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clue Display */}
      {currentRound.scales[0]?.clue && (
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Clue from {currentRound.clueGiverName}:</p>
          <p className="text-lg font-semibold text-blue-800">"{currentRound.scales[0].clue}"</p>
        </div>
      )}

      {/* Gauge Slider (for non-clue givers) */}
      {!isClueGiver && currentRound.scales[0]?.clue && !hasSubmittedGuess && (
        <div className="space-y-6">
          <div>
            {/* Scale Labels */}
            <div className="flex justify-between items-center mb-4 px-8">
              <div className="text-lg font-semibold text-white bg-gray-800 px-3 py-1 rounded-lg shadow-lg">
                {currentRound.scales[0]?.leftLabel}
              </div>
              <div className="text-lg font-semibold text-white bg-gray-800 px-3 py-1 rounded-lg shadow-lg">
                {currentRound.scales[0]?.rightLabel}
              </div>
            </div>
            
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              Click and drag the needle to where you think the target is located
            </label>
            
            {/* Gauge Container */}
            <div className="flex justify-center">
              <div 
                ref={gaugeRef}
                className="relative w-80 h-40 select-none touch-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
              >
                {/* Gauge Background */}
                <div className="absolute inset-0">
                  <svg width="320" height="160" viewBox="0 0 320 160" className="w-full h-full">
                    {/* Gauge Arc */}
                    <path
                      d="M 20 140 A 140 140 0 0 1 300 140"
                      stroke="#e5e7eb"
                      strokeWidth="20"
                      fill="none"
                      strokeLinecap="round"
                    />
                    
                    {/* Colored Zones */}
                    <path
                      d="M 20 140 A 140 140 0 0 1 300 140"
                      stroke="url(#gradient)"
                      strokeWidth="20"
                      fill="none"
                      strokeLinecap="round"
                    />
                    
                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="25%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#f59e0b" />
                        <stop offset="75%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Needle */}
                <div
                  className="absolute bottom-0 left-1/2 w-1 h-32 bg-red-600 transform -translate-x-1/2 origin-bottom"
                  style={{
                    transform: `translateX(-50%) rotate(${(needlePosition - 50) * 1.8}deg)`
                  }}
                >
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-600 rounded-full shadow-lg border-2 border-red-800"></div>
                </div>
                
                {/* Center Pivot */}
                <div className="absolute bottom-0 left-1/2 w-6 h-6 bg-gray-400 rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-lg"></div>
              </div>
            </div>
            
            {/* Position Display */}
            <div className="text-center mt-4">
              <div className="text-lg font-semibold text-gray-800">
                Position: {needlePosition.toFixed(1)}
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            onClick={handleSubmitGuess}
            className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Submit Guess
          </button>
        </div>
      )}

      {/* Clue Giver View */}
      {isClueGiver && (
        <div className="card text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-4">You are the Clue Giver!</h3>
          <p className="text-gray-600 mb-4">
            Your clue has been submitted and is now being used in this round.
          </p>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">Waiting for other players to guess...</p>
          </div>
        </div>
      )}
    </div>
  );
}; 