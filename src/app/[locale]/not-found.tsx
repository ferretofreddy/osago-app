// src/app/[locale]/not-found.tsx

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff] p-5">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-[#0f766e] font-['Plus_Jakarta_Sans'] mb-4">
                    404
                </h1>
                <h2 className="text-2xl font-semibold text-[#111c2d] mb-2">
                    Página no encontrada
                </h2>
                <p className="text-[#3e4947] mb-6">
                    Lo sentimos, la página que buscas no existe.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-[#0f766e] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#005c55] transition-colors"
                >
                    Volver al inicio
                </Link>
            </div>
        </div>
    );
}