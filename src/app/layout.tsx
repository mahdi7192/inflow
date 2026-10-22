import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "inFlow | پلتفرم اتوماسیون کامنت و دایرکت اینستاگرام",
  description:
    "inFlow Control Plane — مدیریت هوشمند پاسخ خودکار کامنت‌ها، دایرکت و لاگ ایجنت‌های اینستاگرام",
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
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <body className={`${vazirmatn.className} min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-indigo-100 selection:text-indigo-950`}>
        {children}
      </body>
    </html>
  );
}

