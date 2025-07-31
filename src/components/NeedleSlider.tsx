import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaArrowUp } from 'react-icons/fa';

interface NeedleSliderProps {
  value: number;
  onChange: (value: number) => void;
  onSubmit: () => void;
  leftLabel: string;
  rightLabel: string;
}

const NeedleSlider = ({ value, onChange, onSubmit, leftLabel, rightLabel }: NeedleSliderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateValue(e.touches[0]);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      updateValue(e.touches[0]);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const updateValue = (e: MouseEvent | Touch | React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.clientX;
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(Math.round(percentage));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div className="space-y-6">
      {/* Scale Display */}
      <div className="relative">
        <div
          ref={sliderRef}
          className="relative h-16 bg-gradient-to-r from-blue-500 via-gray-300 to-red-500 rounded-lg cursor-pointer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Labels */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <span className="text-white font-semibold text-shadow">{leftLabel}</span>
            <span className="text-white font-semibold text-shadow">{rightLabel}</span>
          </div>
          
          {/* Needle */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-black shadow-lg"
            style={{ left: `${value}%` }}
            animate={{ x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-black rounded-full flex items-center justify-center">
              <FaArrowUp className="text-white text-xs" />
            </div>
          </motion.div>
          
          {/* Value indicator */}
          <div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-sm font-mono"
            style={{ left: `${value}%` }}
          >
            {value}%
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          onClick={onSubmit}
          className="btn-success px-8 py-3 text-lg"
        >
          Submit Guess
        </button>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-600">
        <p>Drag the needle to your guess, then click Submit</p>
      </div>
    </div>
  );
};

export default NeedleSlider; 