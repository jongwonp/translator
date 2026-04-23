"use client";

import Link from "next/link";
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] bg-gray-50">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold mb-4">Translator</h1>
        <p className="text-lg text-gray-600 mb-8">
          {t.home.description1}
          <br />
          {t.home.description2}
        </p>
        {isLoggedIn ? (
          <div className="flex gap-4 justify-center">
            <Link
              href="/scripts"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {t.home.createScript}
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">{t.home.loginRequired}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/login"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {t.home.login}
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              >
                {t.home.register}
              </Link>
            </div>
          </div>
        )}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">{t.home.feature1Title}</h3>
            <p className="text-sm text-gray-600">{t.home.feature1Desc}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">{t.home.feature2Title}</h3>
            <p className="text-sm text-gray-600">{t.home.feature2Desc}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-bold mb-2">{t.home.feature3Title}</h3>
            <p className="text-sm text-gray-600">{t.home.feature3Desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
