// src/components/place/PlaceGallery.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Photo {
    url: string;
    is_primary?: boolean;
}

interface PlaceGalleryProps {
    photos: Photo[];
    businessName: string;
}

export default function PlaceGallery({ photos, businessName }: PlaceGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const galleryRef = useRef<HTMLDivElement>(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < photos.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
        if (isRightSwipe && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const nextPhoto = () => {
        if (currentIndex < photos.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevPhoto = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const openLightbox = (index: number) => {
        setCurrentIndex(index);
        setIsLightboxOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        document.body.style.overflow = '';
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isLightboxOpen) return;

            if (e.key === 'ArrowLeft') prevPhoto();
            if (e.key === 'ArrowRight') nextPhoto();
            if (e.key === 'Escape') closeLightbox();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, currentIndex, photos.length]);

    if (!photos || photos.length === 0) {
        return (
            <div className="mb-6">
                <div className="h-48 rounded-xl bg-[#e7eeff] border border-[#E2E8F0] flex items-center justify-center">
                    <span className="text-[#3e4947] text-sm">Sin fotos disponibles</span>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Carrusel Principal */}
            <div className="mb-6">
                <div
                    ref={galleryRef}
                    className="relative h-[280px] rounded-2xl overflow-hidden bg-[#e7eeff] shadow-lg"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Fotos */}
                    <div
                        className="flex h-full transition-transform duration-300 ease-out"
                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                    >
                        {photos.map((photo, index) => (
                            <div
                                key={index}
                                className="min-w-full h-full relative cursor-pointer"
                                onClick={() => openLightbox(index)}
                            >
                                <img
                                    src={photo.url}
                                    alt={`${businessName} - Foto ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                                {/* Indicador de foto principal */}
                                {photo.is_primary && (
                                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-[#005c55]">
                                        Principal
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Botones de navegación (desktop) */}
                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={prevPhoto}
                                disabled={currentIndex === 0}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-[#111c2d]" />
                            </button>
                            <button
                                onClick={nextPhoto}
                                disabled={currentIndex === photos.length - 1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-[#111c2d]" />
                            </button>
                        </>
                    )}

                    {/* Indicadores de posición */}
                    {photos.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                            {photos.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                        ? 'bg-white w-6'
                                        : 'bg-white/60 hover:bg-white/90'
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Contador */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                        {currentIndex + 1} / {photos.length}
                    </div>
                </div>

                {/* Thumbnails (si hay más de 1 foto) */}
                {photos.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2 -mx-1 px-1">
                        {photos.map((photo, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                    ? 'border-[#005c55] ring-2 ring-[#005c55]/20'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <img
                                    src={photo.url}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Botón cerrar */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-5 right-5 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Botones navegación */}
                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    prevPhoto();
                                }}
                                className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6 text-white" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    nextPhoto();
                                }}
                                className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 text-white" />
                            </button>
                        </>
                    )}

                    {/* Imagen */}
                    <div
                        className="max-w-[95vw] max-h-[90vh] relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={photos[currentIndex].url}
                            alt={`${businessName} - Foto ${currentIndex + 1}`}
                            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
                        />

                        {/* Contador */}
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
                            {currentIndex + 1} / {photos.length}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}