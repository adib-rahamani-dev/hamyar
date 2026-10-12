import type { Metadata } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "همیار | فضای یادگیری شما", template: "%s | همیار" },
  description:
    "پایهٔ پلتفرم کلاس و جلسه آنلاین همیار برای مدارس، افراد و سازمان‌ها",
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
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('hamyar-theme')==='light'?'light':'dark'}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
