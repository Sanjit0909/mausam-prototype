import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { LocationProvider } from "@/context/LocationContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Navbar } from "@/components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MAUSAM — Personalised Weather Intelligence",
  description: "MAUSAM adapts live weather, alerts, and recommendations to what matters to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-atmospheric text-mist-100">
        <LanguageProvider>
          <AuthProvider>
            <PreferencesProvider>
              <LocationProvider>
                <Navbar />
                {children}
              </LocationProvider>
            </PreferencesProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
