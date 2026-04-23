"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";
import { Language, LANGUAGES, LANGUAGE_NAMES } from "@/i18n/translations";

interface User {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { language, setLanguage, t } = useTranslation();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-stone-200 text-stone-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-stone-900"
        >
          Translator
        </Link>
        {user && (
          <>
            <Link
              href="/scripts"
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              {t.navbar.scripts}
            </Link>
            <Link
              href="/vocabulary"
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              {t.navbar.vocabulary}
            </Link>
            {user.isAdmin && (
              <Link
                href="/admin/users"
                className="text-sm text-stone-600 hover:text-stone-900"
              >
                {t.navbar.admin}
              </Link>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="text-sm bg-white border border-stone-300 text-stone-700 rounded-full px-3 py-1 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
          aria-label="Change language"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_NAMES[lang]}
            </option>
          ))}
        </select>
        {user ? (
          <>
            <span className="text-sm text-stone-600">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-stone-500 hover:text-stone-900"
            >
              {t.navbar.logout}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            {t.navbar.login}
          </Link>
        )}
      </div>
    </nav>
  );
}
