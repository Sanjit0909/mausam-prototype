import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { LocationProvider } from "@/context/LocationContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { DynamicWeatherBackground } from "@/components/weather/DynamicWeatherBackground";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";
import { ThemeProvider, type Theme } from "@/context/ThemeContext";
import { LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY, isLocale, type Locale } from "@/lib/i18n/translations";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  const initialLocale: Locale = isLocale(cookieLocale) ? cookieLocale : "en";
  const cookieTheme = cookieStore.get("mausam_theme")?.value;
  const initialTheme: Theme = cookieTheme === "dark" ? "dark" : "light";

  return (
    <html
      lang={initialLocale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${initialTheme === "dark" ? "dark" : "light"} h-full antialiased`}
      data-theme={initialTheme}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var sk='${LOCALE_STORAGE_KEY}';var ck='${LOCALE_COOKIE_KEY}';var l=localStorage.getItem(sk);if(l!=='en'&&l!=='hi'){var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE_KEY}=(en|hi)/);l=m?m[1]:null;}if(l==='en'||l==='hi'){document.documentElement.lang=l;document.cookie=ck+'='+l+';path=/;max-age=31536000;SameSite=Lax';localStorage.setItem(sk,l);}var tk='mausam:theme';var tck='mausam_theme';var th=localStorage.getItem(tk);if(th!=='light'&&th!=='dark'){var tm=document.cookie.match(/(?:^|; )mausam_theme=(light|dark)/);th=tm?tm[1]:'light';}if(th==='dark'){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-atmospheric text-mist-100 transition-colors duration-300">
        <ThemeProvider initialTheme={initialTheme}>
          <LanguageProvider initialLocale={initialLocale}>
            <AuthProvider>
              <PreferencesProvider>
                <LocationProvider>
                  <DynamicWeatherBackground />
                  <Navbar />
                  <main className="flex-1 pb-28 md:pb-8">{children}</main>
                  <FloatingAIAssistant />
                  <BottomNav />
                </LocationProvider>
              </PreferencesProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
