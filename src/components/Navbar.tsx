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
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold">
          Translator
        </Link>
        {user && (
          <>
            <Link href="/scripts" className="hover:text-gray-300">
              {t.navbar.scripts}
            </Link>
            <Link href="/vocabulary" className="hover:text-gray-300">
              {t.navbar.vocabulary}
            </Link>
            {user.isAdmin && (
              <Link href="/admin/users" className="hover:text-gray-300">
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
          className="text-sm bg-gray-800 border border-gray-600 rounded px-2 py-1 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <span className="text-sm text-gray-300">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white"
            >
              {t.navbar.logout}
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm hover:text-gray-300">
            {t.navbar.login}
          </Link>
        )}
      </div>
    </nav>
  );
}
