"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/LanguageContext";

export default function Home() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        <div className="rounded-3xl overflow-hidden shadow-sm ring-1 ring-stone-200 bg-white">
          <div className="relative aspect-[16/9]">
            <Image
              src="/homepage-image.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="text-center max-w-2xl mx-auto mt-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900">
            Translator
          </h1>
          <p className="text-lg text-stone-600 mt-5">
            {t.home.description1}
            <br />
            {t.home.description2}
          </p>
          {isLoggedIn ? (
            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href="/scripts"
                className="px-6 py-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 font-medium shadow-sm"
              >
                {t.home.createScript}
              </Link>
            </div>
          ) : (
            <div className="mt-8">
              <p className="text-stone-600 mb-4">{t.home.loginRequired}</p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/login"
                  className="px-6 py-3 bg-sky-500 text-white rounded-full hover:bg-sky-600 font-medium shadow-sm"
                >
                  {t.home.login}
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-3 bg-white border border-stone-300 text-stone-700 rounded-full hover:bg-stone-50 font-medium"
                >
                  {t.home.register}
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
            <h3 className="font-bold mb-2 text-emerald-900">
              {t.home.feature1Title}
            </h3>
            <p className="text-sm text-emerald-900/70 leading-relaxed">
              {t.home.feature1Desc}
            </p>
          </div>
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
            <h3 className="font-bold mb-2 text-rose-900">
              {t.home.feature2Title}
            </h3>
            <p className="text-sm text-rose-900/70 leading-relaxed">
              {t.home.feature2Desc}
            </p>
          </div>
          <div className="bg-violet-50 border border-violet-100 p-6 rounded-2xl">
            <h3 className="font-bold mb-2 text-violet-900">
              {t.home.feature3Title}
            </h3>
            <p className="text-sm text-violet-900/70 leading-relaxed">
              {t.home.feature3Desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
