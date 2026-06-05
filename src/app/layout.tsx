// src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OsaGo - Guía Turística Virtual",
  description: "Tu guía virtual en la Península de Osa, Costa Rica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children; // ← Solo devuelve los children, sin <html> ni <body>
}