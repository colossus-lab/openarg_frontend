import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenArg — Inteligencia sobre Datos Abiertos de Argentina",
  description:
    "Plataforma de análisis inteligente de datos abiertos gubernamentales de Argentina, potenciada por IA multi-agente con Gemini 2.5.",
  keywords: [
    "datos abiertos",
    "Argentina",
    "inteligencia artificial",
    "análisis de datos",
    "gobierno abierto",
    "transparencia",
    "Gemini AI",
  ],
  openGraph: {
    title: "OpenArg — Inteligencia sobre Datos Abiertos de Argentina",
    description:
      "Analizá datos públicos argentinos con IA. Presupuesto, economía, salud, educación y más.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body>
        <div className="bg-grid" />
        {children}
      </body>
    </html>
  );
}
