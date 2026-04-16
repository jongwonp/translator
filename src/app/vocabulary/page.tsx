"use client";

import { useState, useEffect } from "react";

interface VocabWord {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  example: string;
  language: string;
  createdAt: string;
  script: { title: string; url: string } | null;
}

const LANGUAGES = [
  { code: "", name: "전체" },
  { code: "ja", name: "일본어" },
  { code: "en", name: "영어" },
  { code: "zh", name: "중국어" },
];

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [total, setTotal] = useState(0);
  const [language, setLanguage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  const fetchWords = async () => {
    const params = new URLSearchParams();
    if (language) params.set("language", language);
    if (search) params.set("search", search);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    const res = await fetch(`/api/vocabulary?${params}`);
    if (res.ok) {
      const data = await res.json();
      setWords(data.words);
      setTotal(data.total);
    }
  };

  useEffect(() => {
    fetchWords();
  }, [language, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 단어를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
    if (res.ok) fetchWords();
  };

  const handleExport = () => {
    const params = language ? `?language=${language}` : "";
    window.location.href = `/api/vocabulary/export${params}`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">단어장</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
        >
          CSV 내보내기 (Anki)
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-sm ${
                language === lang.code
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="단어 또는 뜻 검색..."
            className="flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            검색
          </button>
        </form>
      </div>

      {/* 단어 목록 */}
      <div className="text-sm text-gray-500 mb-3">총 {total}개 단어</div>

      {words.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          저장된 단어가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {words.map((word) => (
            <div
              key={word.id}
              className="bg-white p-4 rounded-lg shadow-sm border flex items-start justify-between"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{word.word}</span>
                  {word.reading && (
                    <span className="text-sm text-gray-500">
                      ({word.reading})
                    </span>
                  )}
                  <span className="text-sm text-gray-700">{word.meaning}</span>
                </div>
                {word.example && (
                  <p className="text-sm text-gray-400 mt-1">{word.example}</p>
                )}
                {word.script && (
                  <p className="text-xs text-gray-400 mt-1">
                    출처: {word.script.title}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(word.id)}
                className="text-gray-400 hover:text-red-500 text-sm ml-4"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
