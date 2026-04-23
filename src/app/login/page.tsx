"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t.login.failed);
        return;
      }

      window.location.href = "/scripts";
    } catch {
      setError(t.login.serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-sm ring-1 ring-stone-200">
        <h1 className="text-2xl font-bold text-center mb-6 text-stone-900">
          {t.login.title}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t.login.id}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t.login.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 font-medium disabled:opacity-50"
          >
            {loading ? t.login.loggingIn : t.login.submit}
          </button>
        </form>
        <p className="text-center text-sm text-stone-500 mt-6">
          {t.login.noAccount}{" "}
          <Link href="/register" className="text-sky-600 hover:underline">
            {t.login.registerLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
