import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "inFlow | پلتفرم اتوماسیون کامنت و دایرکت اینستاگرام",
  description:
    "inFlow Control Plane — مدیریت هوشمند پاسخ خودکار کامنت‌ها، دایرکت و لاگ ایجنت‌های اینستاگرام طبق زبان طراحی Google Material 3",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full h-[100dvh] overflow-hidden antialiased`}
    >
      <head>
        <link
          rel="preload"
          href="/fonts/Estedad[wght].woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/material-symbols-rounded.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="h-full h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col bg-background text-foreground antialiased selection:bg-primary-container selection:text-on-primary-container">
        {children}
      </body>
    </html>
  );
}
