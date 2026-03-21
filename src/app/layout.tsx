import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import AuthProvider from "@/components/AuthProvider";
import UserSyncProvider from "@/components/UserSyncProvider";
import "./globals.css";
import messages from "../../messages/es.json";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://openarg.org"),
  title: messages.metadata.title,
  description: messages.metadata.description,
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
    title: messages.metadata.ogTitle,
    description: messages.metadata.ogDescription,
    type: "website",
    siteName: "OpenArg",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: messages.metadata.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: messages.metadata.twitterTitle,
    description: messages.metadata.twitterDescription,
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const intlMessages = await getMessages();

  return (
    <html lang="es-AR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('openarg-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <div className="flag-stripe" />
        <NextIntlClientProvider messages={intlMessages}>
          <AuthProvider>
            <UserSyncProvider>
              {children}
            </UserSyncProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
