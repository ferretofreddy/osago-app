// src/components/place/StarRating.tsx

'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
    rating: number;
    maxRating?: number;
    size?: number;
    interactive?: boolean;
    onRate?: (rating: number) => void;
    showValue?: boolean;
}

export default function StarRating({
    rating,
    maxRating = 5,
    size = 20,
    interactive = false,
    onRate,
    showValue = false,
}: StarRatingProps) {
    const handleClick = (value: number) => {
        if (interactive && onRate) {
            onRate(value);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
                {Array.from({ length: maxRating }, (_, i) => {
                    const starValue = i + 1;
                    const isFilled = starValue <= rating;
                    const isHalf = !isFilled && starValue - 0.5 <= rating;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleClick(starValue)}
                            disabled={!interactive}
                            className={`relative transition-transform ${interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
                                }`}
                            style={{ padding: 0, background: 'none', border: 'none' }}
                            aria-label={`${starValue} estrella${starValue !== 1 ? 's' : ''}`}
                        >
                            <Star
                                style={{ width: size, height: size }}
                                className="text-[#bdc9c6]"
                                fill="none"
                                strokeWidth={1.5}
                            />
                            {(isFilled || isHalf) && (
                                <div
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: isHalf ? '50%' : '100%' }}
                                >
                                    <Star
                                        style={{ width: size, height: size }}
                                        className="text-[#fea619]"
                                        fill="currentColor"
                                        strokeWidth={1.5}
                                    />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {showValue && (
                <span className="text-sm font-semibold text-[#111c2d] ml-1">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
}