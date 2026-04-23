"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

interface VocabWord {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  example: string;
  language: string;
  createdAt: string;
  script: { id: number; title: string; url: string } | null;
}

const FILTER_CODES = ["", "ja", "en", "zh"] as const;

export default function VocabularyPage() {
  const { t } = useTranslation();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [total, setTotal] = useState(0);
  const [language, setLanguage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const limit = 30;

  const filterLabel = (code: string) => {
    if (!code) return t.vocabulary.filterAll;
    return (
      t.contentLanguages[code as keyof typeof t.contentLanguages] || code
    );
  };

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
    setSelectedIds(new Set());
  }, [language, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedIds(new Set());
    fetchWords();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === words.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(words.map((w) => w.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t.vocabulary.confirmDeleteSelected(selectedIds.size))) return;

    const res = await fetch("/api/vocabulary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      fetchWords();
    }
  };

  const handleDeleteAll = async () => {
    if (total === 0) return;
    const target = filterLabel(language);
    if (!confirm(t.vocabulary.confirmDeleteAll(target, total))) return;

    // 전체 ID를 가져와서 삭제
    const params = new URLSearchParams();
    if (language) params.set("language", language);
    if (search) params.set("search", search);
    params.set("page", "1");
    params.set("limit", total.toString());

    const listRes = await fetch(`/api/vocabulary?${params}`);
    if (!listRes.ok) return;
    const data = await listRes.json();
    const allIds = data.words.map((w: VocabWord) => w.id);

    const res = await fetch("/api/vocabulary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: allIds }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      setPage(1);
      fetchWords();
    }
  };

  const handleExport = () => {
    const params = language ? `?language=${language}` : "";
    window.location.href = `/api/vocabulary/export${params}`;
  };

  const totalPages = Math.ceil(total / limit);
  const isAllSelected = words.length > 0 && selectedIds.size === words.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t.vocabulary.title}</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-full hover:bg-stone-50 text-sm"
        >
          {t.vocabulary.exportCsv}
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          {FILTER_CODES.map((code) => (
            <button
              key={code}
              onClick={() => {
                setLanguage(code);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-sm ${
                language === code
                  ? "bg-sky-500 text-white"
                  : "bg-white border border-stone-300 text-stone-700 hover:bg-stone-50"
              }`}
            >
              {filterLabel(code)}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.vocabulary.searchPlaceholder}
            className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-sky-500 text-white rounded-full text-sm hover:bg-sky-600"
          >
            {t.vocabulary.search}
          </button>
        </form>
      </div>

      {/* 단어 목록 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500">
            {t.vocabulary.totalWords(total)}
          </span>
          {words.length > 0 && (
            <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
              />
              {t.vocabulary.selectAll}
            </label>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-rose-500 text-white rounded-full text-sm hover:bg-rose-600"
            >
              {t.vocabulary.deleteSelected(selectedIds.size)}
            </button>
          )}
          {total > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-3 py-1.5 bg-white border border-stone-300 text-rose-600 rounded-full text-sm hover:bg-rose-50"
            >
              {t.vocabulary.deleteAll}
            </button>
          )}
        </div>
      </div>

      {words.length === 0 ? (
        <p className="text-stone-500 text-center py-12">{t.vocabulary.empty}</p>
      ) : (
        <div className="space-y-2">
          {words.map((word) => (
            <div
              key={word.id}
              onClick={() => toggleSelect(word.id)}
              className={`bg-white p-4 rounded-2xl shadow-sm ring-1 flex items-start gap-3 cursor-pointer transition ${
                selectedIds.has(word.id)
                  ? "ring-sky-300 bg-sky-50"
                  : "ring-stone-200 hover:ring-stone-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(word.id)}
                onChange={() => toggleSelect(word.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1.5"
              />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{word.word}</span>
                  {word.reading && (
                    <span className="text-sm text-stone-500">
                      ({word.reading})
                    </span>
                  )}
                  <span className="text-sm text-stone-700">{word.meaning}</span>
                </div>
                {word.example && (
                  <p className="text-sm text-stone-400 mt-1">{word.example}</p>
                )}
                {word.script && (
                  <p className="text-xs text-stone-400 mt-1">
                    {t.vocabulary.source}{" "}
                    <Link
                      href={`/scripts/${word.script.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      {word.script.title}
                    </Link>
                  </p>
                )}
              </div>
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
            className="px-3 py-1.5 bg-white border border-stone-300 rounded-full text-sm disabled:opacity-50"
          >
            {t.vocabulary.prev}
          </button>
          <span className="px-3 py-1.5 text-sm text-stone-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 bg-white border border-stone-300 rounded-full text-sm disabled:opacity-50"
          >
            {t.vocabulary.next}
          </button>
        </div>
      )}
    </div>
  );
}
