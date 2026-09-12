import { useState } from 'react';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 0, max = 5, interactive = false, onChange }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(rating);

  const displayRating = interactive ? (hovered ?? selected) : rating;

  function handleClick(index) {
    if (!interactive) return;
    setSelected(index);
    onChange?.(index);
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1;
        const filled = value <= Math.floor(displayRating);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={`p-0 border-none bg-transparent ${
              interactive ? 'cursor-pointer' : 'cursor-default'
            }`}
            onMouseEnter={() => interactive && setHovered(value)}
            onMouseLeave={() => interactive && setHovered(null)}
            onClick={() => handleClick(value)}
          >
            <Star
              size={18}
              className={
                filled
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 fill-gray-300'
              }
            />
          </button>
        );
      })}
      <span className="ml-1 text-sm font-medium text-gray-600">
        {typeof rating === 'number' ? rating.toFixed(1) : '0.0'}
      </span>
    </div>
  );
}
