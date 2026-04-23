"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/LanguageContext";

interface Script {
  id: number;
  title: string;
  url: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  transcriptionModel: string;
  createdAt: string;
}

const modelLabel: Record<string, string> = {
  "whisper-1": "Whisper",
  "gpt-4o-transcribe": "GPT-4o Transcribe",
};

const LANGUAGE_CODES = ["ja", "en", "zh", "ko", "es", "fr"] as const;

export default function ScriptsPage() {
  const { t, language } = useTranslation();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [url, setUrl] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("ja");
  const [targetLanguage, setTargetLanguage] = useState("ko");
  const [transcriptionModel, setTranscriptionModel] = useState("whisper-1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const langName = (code: string) =>
    t.contentLanguages[code as keyof typeof t.contentLanguages] || code;

  const statusLabel: Record<string, { text: string; color: string }> = {
    processing: { text: t.scripts.statusProcessing, color: "text-yellow-600" },
    completed: { text: t.scripts.statusCompleted, color: "text-green-600" },
    failed: { text: t.scripts.statusFailed, color: "text-red-600" },
  };

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
    if (!confirm(t.scripts.confirmDelete)) return;
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
        body: JSON.stringify({
          url,
          sourceLanguage,
          targetLanguage,
          transcriptionModel,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t.scripts.createFailed);
        return;
      }

      setUrl("");
      fetchScripts();
    } catch {
      setError(t.scripts.serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{t.scripts.title}</h1>

      {/* 새 스크립트 생성 폼 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md mb-8"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.scripts.videoUrl}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.scripts.videoUrlPlaceholder}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.scripts.sourceLanguage}
            </label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>
                  {t.contentLanguages[code]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.scripts.targetLanguage}
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>
                  {t.contentLanguages[code]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.scripts.transcriptionModel}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label
              className={`border rounded-md p-3 cursor-pointer transition ${
                transcriptionModel === "whisper-1"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="transcriptionModel"
                  value="whisper-1"
                  checked={transcriptionModel === "whisper-1"}
                  onChange={(e) => setTranscriptionModel(e.target.value)}
                />
                <span className="font-medium text-sm">Whisper</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {t.scripts.whisperPro}
              </p>
              <p className="text-xs text-gray-500">{t.scripts.whisperCon}</p>
            </label>
            <label
              className={`border rounded-md p-3 cursor-pointer transition ${
                transcriptionModel === "gpt-4o-transcribe"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="transcriptionModel"
                  value="gpt-4o-transcribe"
                  checked={transcriptionModel === "gpt-4o-transcribe"}
                  onChange={(e) => setTranscriptionModel(e.target.value)}
                />
                <span className="font-medium text-sm">GPT-4o Transcribe</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{t.scripts.gptPro}</p>
              <p className="text-xs text-gray-500">{t.scripts.gptCon}</p>
            </label>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t.scripts.submitting : t.scripts.submit}
        </button>
      </form>

      {/* 스크립트 목록 */}
      <h2 className="text-xl font-bold mb-4">{t.scripts.listTitle}</h2>
      {scripts.length === 0 ? (
        <p className="text-gray-500">{t.scripts.empty}</p>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const status = statusLabel[script.status] || {
              text: script.status,
              color: "text-gray-600",
            };
            const card = (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-lg font-medium truncate ${
                      script.status === "completed"
                        ? "text-blue-600"
                        : "text-gray-700"
                    }`}
                  >
                    {script.title || t.scripts.noTitle}
                  </p>
                  <div className="text-sm text-gray-500 mt-1">
                    {langName(script.sourceLanguage)} →{" "}
                    {langName(script.targetLanguage)} |{" "}
                    {modelLabel[script.transcriptionModel] ||
                      script.transcriptionModel}{" "}
                    | {new Date(script.createdAt).toLocaleDateString(language)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-medium ${status.color}`}>
                    {status.text}
                  </span>
                  {script.status === "failed" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRetry(script.id);
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {t.scripts.retry}
                    </button>
                  )}
                  {script.status !== "processing" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(script.id);
                      }}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      {t.scripts.delete}
                    </button>
                  )}
                </div>
              </div>
            );

            return script.status === "completed" ? (
              <Link
                key={script.id}
                href={`/scripts/${script.id}`}
                className="block bg-white p-4 rounded-lg shadow-sm border hover:border-blue-300 transition cursor-pointer"
              >
                {card}
              </Link>
            ) : (
              <div
                key={script.id}
                className="bg-white p-4 rounded-lg shadow-sm border"
              >
                {card}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
