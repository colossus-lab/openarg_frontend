import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import UserSyncProvider from "@/components/UserSyncProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenArg — Inteligencia sobre Datos Abiertos de Argentina",
  description:
    "Plataforma de análisis inteligente de datos abiertos gubernamentales de Argentina, potenciada por IA multi-agente de ColossusLab.tech.",
  keywords: [
    "datos abiertos",
    "Argentina",
    "inteligencia artificial",
    "análisis de datos",
    "gobierno abierto",
    "transparencia",
    "ColossusLab.tech",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "OpenArg — Inteligencia sobre Datos Abiertos de Argentina",
    description:
      "Analizá datos públicos argentinos con IA. Presupuesto, economía, salud, educación y más.",
    type: "website",
    siteName: "OpenArg",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenArg — Plataforma de Inteligencia sobre Datos Abiertos de Argentina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenArg — Inteligencia sobre Datos Abiertos de Argentina",
    description:
      "Analizá datos públicos argentinos con IA. Presupuesto, economía, salud, educación y más.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('openarg-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <div className="flag-stripe" />
        <AuthProvider>
          <UserSyncProvider>
            {children}
          </UserSyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
