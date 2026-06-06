// src/components/place/ReviewCard.tsx

'use client';

import { User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import StarRating from './StarRating';

interface Review {
    id: string;
    user_name: string;
    rating: number;
    title?: string;
    comment: string;
    created_at: string;
    is_verified?: boolean;
}

interface ReviewCardProps {
    review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
    const locale = useLocale();
    const t = useTranslations('reviews');

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Intl.RelativeTimeFormat respeta el locale automáticamente
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

        if (diffDays === 0) return rtf.format(0, 'day');
        if (diffDays < 7) return rtf.format(-diffDays, 'day');
        if (diffDays < 30) return rtf.format(-Math.floor(diffDays / 7), 'week');
        if (diffDays < 365) return rtf.format(-Math.floor(diffDays / 30), 'month');
        return rtf.format(-Math.floor(diffDays / 365), 'year');
    };

    return (
        <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white">
            {/* Header: Avatar + Nombre + Fecha */}
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#e7eeff] flex items-center justify-center flex-shrink-0">
                    <User style={{ width: 20, height: 20, color: '#005c55' }} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-[#111c2d] truncate">
                            {review.user_name}
                        </h4>
                        {review.is_verified && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#005c55]/10 text-[#005c55]">
                                {t('verified')}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} size={14} />
                        <span className="text-xs text-[#3e4947]">
                            {formatDate(review.created_at)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Título */}
            {review.title && (
                <h5 className="text-sm font-semibold text-[#111c2d] mb-1">
                    {review.title}
                </h5>
            )}

            {/* Comentario */}
            <p className="text-sm text-[#3e4947] leading-relaxed">
                {review.comment}
            </p>
        </div>
    );
}