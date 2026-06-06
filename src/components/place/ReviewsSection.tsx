// src/components/place/ReviewsSection.tsx

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Send } from 'lucide-react';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';

interface Review {
    id: string;
    user_name: string;
    rating: number;
    title?: string;
    comment: string;
    created_at: string;
    is_verified?: boolean;
}

interface ReviewsSectionProps {
    businessId: string;
}

export default function ReviewsSection({ businessId }: ReviewsSectionProps) {
    const t = useTranslations('reviews');

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Form state
    const [newRating, setNewRating] = useState(0);
    const [newName, setNewName] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        fetchReviews();
    }, [businessId]);

    const fetchReviews = async () => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .eq('business_id', businessId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching reviews:', error);
            } else if (data) {
                setReviews(data);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setNewRating(0);
        setNewName('');
        setNewTitle('');
        setNewComment('');
        setFormError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (newRating === 0) {
            setFormError(t('errorRating'));
            return;
        }
        if (!newName.trim()) {
            setFormError(t('errorName'));
            return;
        }
        if (!newComment.trim()) {
            setFormError(t('errorComment'));
            return;
        }

        setSubmitting(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.from('reviews').insert({
                business_id: businessId,
                user_name: newName.trim(),
                rating: newRating,
                title: newTitle.trim() || null,
                comment: newComment.trim(),
            });

            if (error) {
                console.error('Error submitting review:', error);
                setFormError(t('errorSubmit'));
            } else {
                resetForm();
                fetchReviews();
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setFormError(t('errorSubmit'));
        } finally {
            setSubmitting(false);
        }
    };

    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    if (loading) {
        return (
            <div className="mb-6">
                <div className="h-6 bg-[#e7eeff] rounded animate-pulse w-1/3 mb-4" />
                <div className="h-24 bg-[#e7eeff] rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="mb-6">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <MessageSquare style={{ width: 24, height: 24, color: '#005c55' }} />
                    <h2 className="text-2xl font-semibold text-[#111c2d] font-['Plus_Jakarta_Sans']">
                        {t('title')}
                    </h2>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 rounded-full bg-[#005c55] text-white text-sm font-semibold hover:bg-[#0f766e] transition-colors active:scale-95"
                    >
                        {t('writeReview')}
                    </button>
                )}
            </div>

            {/* Resumen de calificaciones */}
            {reviews.length > 0 && (
                <div className="p-4 rounded-xl bg-[#f0f3ff] border border-[#E2E8F0] mb-4">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-[#005c55] font-['Plus_Jakarta_Sans']">
                                {averageRating.toFixed(1)}
                            </div>
                            <StarRating rating={averageRating} size={16} />
                            <div className="text-xs text-[#3e4947] mt-1">
                                {reviews.length} {reviews.length === 1 ? t('review') : t('reviews')}
                            </div>
                        </div>

                        <div className="flex-1 space-y-1">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = reviews.filter(r => r.rating === star).length;
                                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-2">
                                        <span className="text-xs text-[#3e4947] w-3">{star}</span>
                                        <div className="flex-1 h-2 bg-[#e7eeff] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#fea619] rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Formulario */}
            {showForm && (
                <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-[#f0f3ff] border border-[#E2E8F0] mb-4">
                    <h3 className="text-lg font-semibold text-[#111c2d] mb-3">
                        {t('formTitle')}
                    </h3>

                    {/* Error general */}
                    {formError && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                            {formError}
                        </div>
                    )}

                    {/* Rating */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[#111c2d] mb-2">
                            {t('labelRating')} *
                        </label>
                        <StarRating rating={newRating} size={32} interactive={true} onRate={setNewRating} />
                    </div>

                    {/* Nombre */}
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-[#111c2d] mb-1">
                            {t('labelName')} *
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t('placeholderName')}
                            className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#111c2d] placeholder:text-[#bdc9c6] focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                        />
                    </div>

                    {/* Título */}
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-[#111c2d] mb-1">
                            {t('labelTitle')}
                        </label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder={t('placeholderTitle')}
                            className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#111c2d] placeholder:text-[#bdc9c6] focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55]"
                        />
                    </div>

                    {/* Comentario */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[#111c2d] mb-1">
                            {t('labelComment')} *
                        </label>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('placeholderComment')}
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#111c2d] placeholder:text-[#bdc9c6] focus:outline-none focus:ring-2 focus:ring-[#005c55]/20 focus:border-[#005c55] resize-none"
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="flex-1 py-2.5 rounded-full border-2 border-[#005c55] text-[#005c55] font-semibold text-sm hover:bg-[#005c55]/5 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2.5 rounded-full bg-[#005c55] text-white font-semibold text-sm hover:bg-[#0f766e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('sending')}
                                </>
                            ) : (
                                <>
                                    <Send style={{ width: 16, height: 16 }} />
                                    {t('send')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {/* Lista de reseñas */}
            {reviews.length > 0 ? (
                <div className="space-y-3">
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <MessageSquare style={{ width: 48, height: 48, color: '#bdc9c6', margin: '0 auto 12px' }} />
                    <p className="text-sm text-[#3e4947]">{t('empty')}</p>
                </div>
            )}

        </div>
    );
}