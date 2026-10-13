import Link from "next/link";
import { AudioLines, ArrowRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AppearanceToggle } from "./appearance-toggle";
import "@/app/account.css";
export function AccountFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="management-shell account-shell">
      <a className="skip-link" href="#account-content">
        رفتن به محتوای اصلی
      </a>
      <header className="account-topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          <strong>همیار</strong>
        </Link>
        <div className="topbar-actions">
          <AppearanceToggle />
          <ThemeToggle />
        </div>
      </header>
      <main id="account-content" className="account-content">
        {children}
      </main>
      <footer className="account-footer">
        <Link href="/demo">
          <ArrowRight size={16} /> بازگشت به فضای نمونه
        </Link>
        <span>ورود امن؛ فضای مستقل هر مجموعه</span>
      </footer>
    </div>
  );
}
