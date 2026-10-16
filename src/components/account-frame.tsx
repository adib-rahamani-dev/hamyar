import Link from "next/link";
import { AudioLines, ArrowRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AppearanceToggle } from "./appearance-toggle";
import "@/app/account.css";
export function AccountFrame({
  children,
  navigation = false,
}: {
  children: React.ReactNode;
  navigation?: boolean;
}) {
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
      {navigation && (
        <nav className="workspace-navigation" aria-label="پنل همیار">
          <Link href="/workspace">مجموعه‌ها و اتاق‌ها</Link>
          <Link href="/supervisor">مرکز نظارت</Link>
          <Link href="/support">پشتیبانی</Link>
          <Link href="/settings">ظاهر مجموعه</Link>
          <Link href="/account/security">امنیت حساب</Link>
        </nav>
      )}
      <main id="account-content" className="account-content">
        {children}
      </main>
      <footer className="account-footer">
        <Link href="/workspace">
          <ArrowRight size={16} /> مجموعه‌های شما
        </Link>
        <span>ورود امن؛ فضای مستقل هر مجموعه</span>
      </footer>
    </div>
  );
}
