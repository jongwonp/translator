"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Script {
  id: number;
  title: string;
  url: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  createdAt: string;
}

const LANGUAGES = [
  { code: "ja", name: "일본어" },
  { code: "en", name: "영어" },
  { code: "zh", name: "중국어" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "스페인어" },
  { code: "fr", name: "프랑스어" },
];

const langName = (code: string) =>
  LANGUAGES.find((l) => l.code === code)?.name || code;

const statusLabel: Record<string, { text: string; color: string }> = {
  processing: { text: "처리 중...", color: "text-yellow-600" },
  completed: { text: "완료", color: "text-green-600" },
  failed: { text: "실패", color: "text-red-600" },
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [url, setUrl] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("ko");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchScripts = async () => {
    const res = await fetch("/api/scripts");
    if (res.ok) {
      const data = await res.json();
      setScripts(data.scripts);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  // Poll for processing scripts
  useEffect(() => {
    const hasProcessing = scripts.some((s) => s.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(fetchScripts, 3000);
    return () => clearInterval(interval);
  }, [scripts]);

  const handleRetry = async (scriptId: number) => {
    try {
      const res = await fetch(`/api/scripts/${scriptId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        fetchScripts();
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (scriptId: number) => {
    if (!confirm("이 스크립트를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== scriptId));
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sourceLanguage, targetLanguage }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "스크립트 생성에 실패했습니다.");
        return;
      }

      setUrl("");
      fetchScripts();
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">스크립트 생성</h1>

      {/* 새 스크립트 생성 폼 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md mb-8"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            영상 URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... 또는 빌리빌리 URL"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              원본 언어
            </label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              번역 언어
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "처리 요청 중..." : "스크립트 생성"}
        </button>
      </form>

      {/* 스크립트 목록 */}
      <h2 className="text-xl font-bold mb-4">내 스크립트</h2>
      {scripts.length === 0 ? (
        <p className="text-gray-500">아직 생성된 스크립트가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const status = statusLabel[script.status] || {
              text: script.status,
              color: "text-gray-600",
            };
            return (
              <div
                key={script.id}
                className="bg-white p-4 rounded-lg shadow-sm border hover:border-blue-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    {script.status === "completed" ? (
                      <Link
                        href={`/scripts/${script.id}`}
                        className="text-lg font-medium text-blue-600 hover:underline"
                      >
                        {script.title || "제목 없음"}
                      </Link>
                    ) : (
                      <span className="text-lg font-medium text-gray-700">
                        {script.title || "제목 없음"}
                      </span>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      {langName(script.sourceLanguage)} →{" "}
                      {langName(script.targetLanguage)} |{" "}
                      {new Date(script.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${status.color}`}>
                      {status.text}
                    </span>
                    {script.status === "failed" && (
                      <>
                        <button
                          onClick={() => handleRetry(script.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          재시도
                        </button>
                        <button
                          onClick={() => handleDelete(script.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
