import Link from "next/link";
import { ArrowRight, AudioLines } from "lucide-react";

export default function NotFound() {
  return (
    <main
      className="empty-state"
      style={{ maxWidth: 600, margin: "15vh auto", border: "none" }}
    >
      <AudioLines size={40} className="accent-text" />
      <h1>این صفحه پیدا نشد.</h1>
      <p>از پیشخوان همیار، مسیرتان را ادامه دهید.</p>
      <Link className="button primary" href="/">
        <ArrowRight size={17} /> بازگشت به پیشخوان
      </Link>
    </main>
  );
}
