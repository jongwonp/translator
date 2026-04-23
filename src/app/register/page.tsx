"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

export default function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t.register.failed);
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t.register.serverError);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-sm ring-1 ring-stone-200 text-center">
          <h1 className="text-2xl font-bold mb-4 text-stone-900">
            {t.register.completeTitle}
          </h1>
          <p className="text-stone-700 mb-6">
            {t.register.completeMessage1}
            <br />
            {t.register.completeMessage2}
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 font-medium"
          >
            {t.register.goToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-sm ring-1 ring-stone-200">
        <h1 className="text-2xl font-bold text-center mb-6 text-stone-900">
          {t.register.title}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t.register.nickname}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t.register.id}
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
              {t.register.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 font-medium disabled:opacity-50"
          >
            {loading ? t.register.registering : t.register.submit}
          </button>
        </form>
        <p className="text-center text-sm text-stone-500 mt-6">
          {t.register.hasAccount}{" "}
          <Link href="/login" className="text-sky-600 hover:underline">
            {t.register.loginLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
