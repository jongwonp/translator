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
    downloading: { text: t.scripts.statusDownloading, color: "text-yellow-600" },
    transcribing: { text: t.scripts.statusTranscribing, color: "text-yellow-600" },
    translating: { text: t.scripts.statusTranslating, color: "text-yellow-600" },
    processing: { text: t.scripts.statusProcessing, color: "text-yellow-600" },
    completed: { text: t.scripts.statusCompleted, color: "text-green-600" },
    failed: { text: t.scripts.statusFailed, color: "text-rose-600" },
  };

  // status 문자열에 "transcribing:3/7" 같은 진행 카운터가 인코딩될 수 있어 분리해서 본다.
  const parseStatus = (
    status: string
  ): { stage: string; done?: number; total?: number } => {
    const colonIdx = status.indexOf(":");
    if (colonIdx === -1) return { stage: status };
    const stage = status.slice(0, colonIdx);
    const [doneStr, totalStr] = status.slice(colonIdx + 1).split("/");
    const done = parseInt(doneStr);
    const total = parseInt(totalStr);
    if (Number.isNaN(done) || Number.isNaN(total)) return { stage };
    return { stage, done, total };
  };

  const formatStatus = (status: string) => {
    const { stage, done, total } = parseStatus(status);
    const info = statusLabel[stage] || {
      text: stage,
      color: "text-stone-600",
    };
    const text =
      done !== undefined && total !== undefined
        ? `${info.text.replace(/\.{3}$/, "")} (${done}/${total})`
        : info.text;
    return { text, color: info.color };
  };

  const isInProgress = (status: string) => {
    const { stage } = parseStatus(status);
    return stage !== "completed" && stage !== "failed";
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
    const hasProcessing = scripts.some((s) => isInProgress(s.status));
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

  const handleDelete = async (scriptId: number, confirmMessage: string) => {
    if (!confirm(confirmMessage)) return;
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
        className="bg-white p-6 rounded-3xl shadow-sm ring-1 ring-stone-200 mb-8"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {t.scripts.videoUrl}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.scripts.videoUrlPlaceholder}
            required
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t.scripts.sourceLanguage}
            </label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              {LANGUAGE_CODES.map((code) => (
                <option key={code} value={code}>
                  {t.contentLanguages[code]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t.scripts.targetLanguage}
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
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
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t.scripts.transcriptionModel}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label
              className={`border rounded-2xl p-4 cursor-pointer transition ${
                transcriptionModel === "whisper-1"
                  ? "border-sky-400 bg-sky-50"
                  : "border-stone-300 hover:border-stone-400"
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
              <p className="text-xs text-stone-600 mt-1">
                {t.scripts.whisperPro}
              </p>
              <p className="text-xs text-stone-500">{t.scripts.whisperCon}</p>
            </label>
            <label
              className={`border rounded-2xl p-4 cursor-pointer transition ${
                transcriptionModel === "gpt-4o-transcribe"
                  ? "border-sky-400 bg-sky-50"
                  : "border-stone-300 hover:border-stone-400"
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
              <p className="text-xs text-stone-600 mt-1">{t.scripts.gptPro}</p>
              <p className="text-xs text-stone-500">{t.scripts.gptCon}</p>
            </label>
          </div>
        </div>
        {error && <p className="text-rose-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 font-medium disabled:opacity-50"
        >
          {loading ? t.scripts.submitting : t.scripts.submit}
        </button>
      </form>

      {/* 스크립트 목록 */}
      <h2 className="text-xl font-bold mb-4">{t.scripts.listTitle}</h2>
      {scripts.length === 0 ? (
        <p className="text-stone-500">{t.scripts.empty}</p>
      ) : (
        <div className="space-y-3">
          {scripts.map((script) => {
            const status = formatStatus(script.status);
            const inProgress = isInProgress(script.status);
            const removeLabel = inProgress
              ? t.scripts.cancel
              : t.scripts.delete;
            const removeConfirm = inProgress
              ? t.scripts.confirmCancel
              : t.scripts.confirmDelete;
            const card = (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-lg font-medium truncate ${
                      script.status === "completed"
                        ? "text-sky-600"
                        : "text-stone-700"
                    }`}
                  >
                    {script.title || t.scripts.noTitle}
                  </p>
                  <div className="text-sm text-stone-500 mt-1">
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
                      className="px-3 py-1 text-sm bg-sky-500 text-white rounded-full hover:bg-sky-600"
                    >
                      {t.scripts.retry}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(script.id, removeConfirm);
                    }}
                    className="px-3 py-1 text-sm bg-rose-500 text-white rounded-full hover:bg-rose-600"
                  >
                    {removeLabel}
                  </button>
                </div>
              </div>
            );

            return script.status === "completed" ? (
              <Link
                key={script.id}
                href={`/scripts/${script.id}`}
                className="block bg-white p-4 rounded-2xl shadow-sm ring-1 ring-stone-200 hover:ring-sky-300 transition cursor-pointer"
              >
                {card}
              </Link>
            ) : (
              <div
                key={script.id}
                className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-stone-200"
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
