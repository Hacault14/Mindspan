import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { submitAllClues } from '../lib/firebase';
import { GameState, Scale, SubmittedClue } from '../types/game';

interface ClueSubmissionPhaseProps {
  game: GameState;
  currentUser: any;
  onAllCluesSubmitted: () => void;
}

export const ClueSubmissionPhase: React.FC<ClueSubmissionPhaseProps> = ({
  game,
  currentUser,
  onAllCluesSubmitted
}) => {
  const [clues, setClues] = useState<{ scaleId: string; clue: string; scale?: any }[]>([]);
  const [scales, setScales] = useState<Scale[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const cluesPerPlayer = game.cluesPerPlayer || 1;

    // Generate scales once when component mounts
  useEffect(() => {
    const generateScales = () => {
      // Use the same deterministic scale generation as the server
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
          { left: 'Hot', right: 'Cold' },
          { left: 'Warm', right: 'Chilly' },
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
          { left: 'Clean', right: 'Messy' },
          { left: 'Pure', right: 'Impure' },
          { left: 'Natural', right: 'Artificial' },
          { left: 'Organic', right: 'Synthetic' },
          { left: 'Real', right: 'Fake' },
          { left: 'Authentic', right: 'Fake' },
          { left: 'Genuine', right: 'Counterfeit' },
          { left: 'Honest', right: 'Fake' },
          { left: 'Sincere', right: 'Insincere' },
          { left: 'Truthful', right: 'Lying' },
          { left: 'Direct', right: 'Indirect' },
          { left: 'Straightforward', right: 'Evasive' },
          { left: 'Clear', right: 'Confusing' },
          { left: 'Obvious', right: 'Subtle' },
          { left: 'Visible', right: 'Hidden' },
          { left: 'Transparent', right: 'Opaque' },
          { left: 'Open', right: 'Secretive' },
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
          { left: 'Positive', right: 'Negative' },
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
          { left: 'Wide', right: 'Limited' },
          { left: 'Extensive', right: 'Minimal' },
          { left: 'Comprehensive', right: 'Incomplete' },
          { left: 'Thorough', right: 'Superficial' },
          { left: 'Deep', right: 'Shallow' },
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
          { left: 'Beautiful', right: 'Functional' },
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
          { left: 'Bold', right: 'Subtle' },
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
          { left: 'Obvious', right: 'Subtle' },
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
          { left: 'Fluid', right: 'Stiff' },
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
          { left: 'Strong', right: 'Weak' },
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
          { left: 'Fluid', right: 'Stiff' },
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
          { left: 'Strong', right: 'Weak' },
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
          { left: 'Strong', right: 'Weak' }
        ];
      
      const generatedScales: Scale[] = [];
      const usedPairs = new Set<string>();
      
      for (let i = 0; i < cluesPerPlayer; i++) {
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
        
        generatedScales.push({
          id: `scale-${currentUser?.uid}-${i}-${Date.now()}-${Math.random()}`,
          leftLabel: pair.left,
          rightLabel: pair.right,
          targetValue: targetValue
        });
      }
      
      setScales(generatedScales);
    };

    generateScales();
  }, [cluesPerPlayer, currentUser?.uid]);

  useEffect(() => {
    // Initialize clues array with actual scaleIds and scale data once scales are generated
    if (scales.length > 0) {
      const initialClues = scales.map((scale, index) => ({
        scaleId: scale.id,
        clue: '',
        scale: scale // Include the full scale object
      }));
      setClues(initialClues);
    }
  }, [scales, cluesPerPlayer]);

  useEffect(() => {
    if (game.clueSubmissionEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, game.clueSubmissionEndTime! - Date.now());
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          // Auto-submit if time runs out
          handleSubmitClues();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [game.clueSubmissionEndTime]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClueChange = (index: number, value: string) => {
    const updatedClues = [...clues];
    updatedClues[index] = { ...updatedClues[index], clue: value };
    setClues(updatedClues);
  };

  const handleSubmitClues = async () => {
    if (!currentUser) return;

    const hasEmptyClues = clues.some(clue => !clue.clue.trim());
    if (hasEmptyClues) {
      toast.error('Please fill in all clues before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAllClues(game.id, currentUser.uid, clues);
      toast.success('Clues submitted successfully!');
      onAllCluesSubmitted();
    } catch (error) {
      console.error('Error submitting clues:', error);
      toast.error('Failed to submit clues. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPlayer = game.players.find(p => p.id === currentUser?.uid);
  const hasSubmittedClues = currentPlayer?.submittedClues && currentPlayer.submittedClues.length > 0;
  
  // Check if all players have submitted their clues
  const allPlayersSubmitted = game.players.every(player => 
    player.submittedClues && player.submittedClues.length >= (game.cluesPerPlayer || 1)
  );

  // Show loading state while scales are being generated
  if (scales.length === 0) {
    return (
      <div className="card text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h2>
        <p className="text-gray-600">Preparing your scales...</p>
      </div>
    );
  }

  if (hasSubmittedClues) {
    return (
      <div className="card text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Clues Submitted!</h2>
        <p className="text-gray-600 mb-4">
          You've submitted {currentPlayer.submittedClues!.length} clue{currentPlayer.submittedClues!.length !== 1 ? 's' : ''}.
        </p>
        <div className="space-y-2">
          {currentPlayer.submittedClues!.map((clue, index) => (
            <div key={clue.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="font-medium text-green-800">Clue {index + 1}</div>
              <div className="text-green-700">{clue.clue}</div>
            </div>
          ))}
        </div>
        {allPlayersSubmitted ? (
          <div className="mt-4">
            <p className="text-green-600 font-medium">All players have submitted their clues!</p>
            <p className="text-gray-500">The game will start automatically...</p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-gray-500">Waiting for other players to submit their clues...</p>
            <div className="mt-2 text-sm text-gray-400">
              {game.players.filter(p => !p.submittedClues || p.submittedClues.length < (game.cluesPerPlayer || 1)).map(player => (
                <div key={player.id} className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>{player.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Submit Your Clues</h2>
          <p className="text-gray-600">
            You need to submit {cluesPerPlayer} clue{cluesPerPlayer !== 1 ? 's' : ''} for this game.
          </p>
          {timeLeft > 0 && (
            <div className="mt-4">
              <div className="text-xl font-bold text-red-600">{formatTime(timeLeft)}</div>
              <div className="text-sm text-gray-500">Time remaining</div>
            </div>
          )}
        </div>
      </div>

      {/* Clue Submission Forms */}
      <div className="space-y-4">
        {clues.map((clue, index) => {
          const scale = scales[index];

          return (
            <div key={clue.scaleId} className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Clue {index + 1} of {cluesPerPlayer}
              </h3>
              
              {/* Scale Display */}
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="text-lg font-medium text-gray-700">Target Scale</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {scale.leftLabel} ↔ {scale.rightLabel}
                  </div>
                </div>
                
                {/* Target Zone Display */}
                <div className="flex justify-center mb-4">
                  <div className="relative w-80 h-40">
                    <svg width="320" height="160" viewBox="0 0 320 160" className="w-full h-full">
                      {/* Gauge Arc */}
                      <path
                        d="M 20 140 A 140 140 0 0 1 300 140"
                        stroke="#e5e7eb"
                        strokeWidth="20"
                        fill="none"
                        strokeLinecap="round"
                      />
                      
                      {/* Target Zone */}
                      <path
                        d="M 20 140 A 140 140 0 0 1 300 140"
                        stroke="#3b82f6"
                        strokeWidth="20"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="10,5"
                        opacity="0.7"
                      />
                    </svg>
                    
                    {/* Target Indicator */}
                    <div
                      className="absolute bottom-0 left-1/2 w-1 h-32 bg-green-600 transform -translate-x-1/2 origin-bottom"
                      style={{
                        transform: `translateX(-50%) rotate(${(scale.targetValue - 50) * 1.8}deg)`
                      }}
                    >
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-600 rounded-full shadow-lg border-2 border-green-800"></div>
                    </div>
                    
                    {/* Center Pivot */}
                    <div className="absolute bottom-0 left-1/2 w-6 h-6 bg-gray-400 rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-lg"></div>
                  </div>
                </div>
                
                <div className="text-center text-sm text-gray-600">
                  Target is at position {scale.targetValue.toFixed(1)}
                </div>
              </div>
              
              {/* Clue Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Clue
                </label>
                <textarea
                  value={clue.clue}
                  onChange={(e) => handleClueChange(index, e.target.value)}
                  placeholder="Enter a clue that will help others guess the target position..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={3}
                  maxLength={100}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {clue.clue.length}/100
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="card">
        <button
          onClick={handleSubmitClues}
          disabled={isSubmitting || clues.some(clue => !clue.clue.trim())}
          className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          {isSubmitting ? 'Submitting...' : `Submit ${cluesPerPlayer} Clue${cluesPerPlayer !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Player Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Player Status</h3>
        <div className="space-y-2">
          {game.players.map((player) => {
            const hasSubmitted = player.submittedClues && player.submittedClues.length > 0;
            const isCurrentPlayer = player.id === currentUser?.uid;
            
            return (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentPlayer ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasSubmitted ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                  }`}>
                    {hasSubmitted ? '✓' : '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {player.name}
                      {isCurrentPlayer && <span className="text-primary-600 ml-2">(You)</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      {hasSubmitted 
                        ? `${player.submittedClues!.length} clue${player.submittedClues!.length !== 1 ? 's' : ''} submitted`
                        : 'Waiting for clues...'
                      }
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}; 