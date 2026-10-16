import type { Metadata } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "./globals.css";
import { DevicePreferencesProvider } from "@/components/device-preferences";

export const metadata: Metadata = {
  title: { default: "همیار | فضای یادگیری شما", template: "%s | همیار" },
  description:
    "همیار؛ فضای فارسی کلاس و جلسه، با گفت‌وگو، تختهٔ مشترک و امکان میزبانی روی زیرساخت انتخابی شما.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('hamyar-theme')==='light'?'light':'dark';document.documentElement.dataset.effects=localStorage.getItem('hamyar-effects')==='off'?'off':'on'}catch{}`,
          }}
        />
      </head>
      <body>
        <DevicePreferencesProvider>{children}</DevicePreferencesProvider>
      </body>
    </html>
  );
}
