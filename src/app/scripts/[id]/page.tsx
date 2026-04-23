"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/LanguageContext";

interface Segment {
  id: number;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText: string;
  position: number;
}

interface Script {
  id: number;
  title: string;
  url: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  transcriptionModel: string;
  segments: Segment[];
}

interface ExtractedWord {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  segmentId: number;
  difficulty: string;
}

// 난이도 필터링 기준: level 이상의 단어만 표시
const DIFFICULTY_FILTER: Record<string, Record<string, string[]>> = {
  ja: {
    beginner: ["N5", "N4", "N3", "N2", "N1"],
    intermediate: ["N3", "N2", "N1"],
    advanced: ["N1"],
  },
  en: {
    beginner: ["A1", "A2", "B1", "B2", "C1", "C2"],
    intermediate: ["B1", "B2", "C1", "C2"],
    advanced: ["C1", "C2"],
  },
  zh: {
    beginner: ["1급", "2급", "3급", "4급", "5급", "6급"],
    intermediate: ["3급", "4급", "5급", "6급"],
    advanced: ["5급", "6급"],
  },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

function getBilibiliId(url: string): string | null {
  const match = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  return match?.[1] || null;
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.。]+[.。]?/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ScriptDetailPage() {
  const params = useParams();
  const scriptId = params.id as string;
  const { t } = useTranslation();

  const [script, setScript] = useState<Script | null>(null);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<number>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [level, setLevel] = useState("intermediate");
  const [followScript, setFollowScript] = useState(true);
  const [viewMode, setViewMode] = useState<"timeline" | "full">("timeline");

  const playerRef = useRef<YT.Player | null>(null);
  const playerReadyRef = useRef(false);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scriptContainerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch script data
  useEffect(() => {
    fetch(`/api/scripts/${scriptId}`)
      .then((res) => res.json())
      .then((data) => setScript(data))
      .catch(console.error);
  }, [scriptId]);

  // 타임라인 미지원 모델은 viewMode를 full로 강제
  useEffect(() => {
    if (script && script.transcriptionModel !== "whisper-1") {
      setViewMode("full");
    }
  }, [script]);

  // 이전에 추출한 단어 복원
  useEffect(() => {
    const saved = localStorage.getItem(`extracted-words-${scriptId}`);
    if (!saved) return;
    try {
      const words = JSON.parse(saved);
      if (Array.isArray(words) && words.length > 0) {
        setExtractedWords(words);
        setShowWords(true);
      }
    } catch {
      localStorage.removeItem(`extracted-words-${scriptId}`);
    }
  }, [scriptId]);

  // Initialize YouTube player
  useEffect(() => {
    if (!script) return;
    const ytId = getYouTubeId(script.url);
    if (!ytId) return;

    const loadPlayer = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: ytId,
        height: "100%",
        width: "100%",
        playerVars: { autoplay: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTimeTracking();
            } else {
              stopTimeTracking();
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      loadPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = loadPlayer;
    }

    return () => {
      stopTimeTracking();
      playerRef.current?.destroy?.();
      playerRef.current = null;
      playerReadyRef.current = false;
    };
  }, [script]);

  const followRef = useRef(followScript);
  useEffect(() => {
    followRef.current = followScript;
  }, [followScript]);

  const startTimeTracking = useCallback(() => {
    stopTimeTracking();
    timerRef.current = setInterval(() => {
      if (!playerRef.current || !script || !playerReadyRef.current) return;
      const currentTime = playerRef.current.getCurrentTime();
      const seg = script.segments.find(
        (s) => currentTime >= s.startTime && currentTime <= s.endTime
      );
      if (seg) {
        setActiveSegment(seg.id);
        if (followRef.current) {
          const container = scriptContainerRef.current;
          const el = segmentRefs.current.get(seg.id);
          if (container && el) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const relativeTop = elRect.top - containerRect.top;
            const relativeBottom = relativeTop + elRect.height;
            if (relativeTop < 0) {
              container.scrollTo({
                top: container.scrollTop + relativeTop,
                behavior: "smooth",
              });
            } else if (relativeBottom > container.clientHeight) {
              container.scrollTo({
                top:
                  container.scrollTop +
                  (relativeBottom - container.clientHeight),
                behavior: "smooth",
              });
            }
          }
        }
      }
    }, 500);
  }, [script]);

  const stopTimeTracking = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const seekTo = (time: number) => {
    if (playerRef.current && playerReadyRef.current) {
      playerRef.current.seekTo(time, true);
      playerRef.current.playVideo();
    }
  };

  const handleExtractWords = async () => {
    if (extractedWords.length > 0) {
      if (!confirm(t.scriptDetail.confirmReExtract)) return;
    }
    setExtracting(true);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/extract-words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setExtractedWords(data.words);
        setSelectedWords(new Set());
        setShowWords(true);
        localStorage.setItem(
          `extracted-words-${scriptId}`,
          JSON.stringify(data.words)
        );
      }
    } catch (error) {
      console.error("Word extraction failed:", error);
    } finally {
      setExtracting(false);
    }
  };

  // 레벨에 따라 프론트에서 필터링
  const filteredWords = extractedWords.filter((w) => {
    const allowed =
      DIFFICULTY_FILTER[script?.sourceLanguage || ""]?.[level];
    if (!allowed) return true;
    return allowed.some((d) => w.difficulty.toUpperCase().includes(d.toUpperCase()));
  });

  const toggleWord = (index: number) => {
    setSelectedWords((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSaveWords = async () => {
    if (selectedWords.size === 0 || !script) return;
    setSaving(true);
    try {
      const wordsToSave = extractedWords.filter((_, i) =>
        selectedWords.has(i)
      );
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: script.id,
          language: script.sourceLanguage,
          words: wordsToSave,
        }),
      });
      if (res.ok) {
        alert(t.scriptDetail.savedAlert(wordsToSave.length));
        setShowWords(false);
        setExtractedWords([]);
        setSelectedWords(new Set());
        localStorage.removeItem(`extracted-words-${scriptId}`);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!script) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <p className="text-stone-500">{t.scriptDetail.loading}</p>
      </div>
    );
  }

  const ytId = getYouTubeId(script.url);
  const biliId = getBilibiliId(script.url);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{script.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 영상 플레이어 */}
        <div>
          <div className="aspect-video bg-black rounded-2xl overflow-hidden">
            {ytId ? (
              <div id="yt-player" />
            ) : biliId ? (
              <iframe
                src={`https://player.bilibili.com/player.html?bvid=${biliId}&autoplay=0`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-stone-400">
                {t.scriptDetail.videoEmbedFailed}
              </div>
            )}
          </div>

          {/* 단어 추출 패널 */}
          <div className="mt-4 bg-white rounded-3xl shadow-sm ring-1 ring-stone-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={handleExtractWords}
                disabled={extracting}
                className="px-4 py-1.5 bg-emerald-500 text-white text-sm rounded-full hover:bg-emerald-600 disabled:opacity-50"
              >
                {extracting ? t.scriptDetail.extracting : t.scriptDetail.extractWords}
              </button>
              {showWords && extractedWords.length > 0 && (
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setSelectedWords(new Set());
                  }}
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-full text-sm"
                >
                  <option value="beginner">{t.scriptDetail.levelBeginner}</option>
                  <option value="intermediate">{t.scriptDetail.levelIntermediate}</option>
                  <option value="advanced">{t.scriptDetail.levelAdvanced}</option>
                </select>
              )}
            </div>

            {showWords && filteredWords.length > 0 && (
              <div>
                {(() => {
                  const filteredIndices = filteredWords.map((w) =>
                    extractedWords.indexOf(w)
                  );
                  const allSelected = filteredIndices.every((i) =>
                    selectedWords.has(i)
                  );
                  const toggleAll = () => {
                    setSelectedWords((prev) => {
                      const next = new Set(prev);
                      if (allSelected) {
                        filteredIndices.forEach((i) => next.delete(i));
                      } else {
                        filteredIndices.forEach((i) => next.add(i));
                      }
                      return next;
                    });
                  };
                  return (
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-stone-400">
                        {t.scriptDetail.showingFiltered(
                          extractedWords.length,
                          filteredWords.length
                        )}
                      </p>
                      <button
                        onClick={toggleAll}
                        className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
                      >
                        {allSelected
                          ? t.scriptDetail.deselectAll
                          : t.scriptDetail.selectAll}
                      </button>
                    </div>
                  );
                })()}
                <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
                  {filteredWords.map((word) => {
                    const originalIndex = extractedWords.indexOf(word);
                    return (
                      <label
                        key={originalIndex}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-stone-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWords.has(originalIndex)}
                          onChange={() => toggleWord(originalIndex)}
                          className="mt-1"
                        />
                        <div className="text-sm">
                          <span className="font-bold">{word.word}</span>
                          {word.reading && (
                            <span className="text-stone-500 ml-1">
                              ({word.reading})
                            </span>
                          )}
                          <span className="text-stone-700 ml-2">
                            {word.meaning}
                          </span>
                          <span className="text-xs text-stone-400 ml-1">
                            [{word.difficulty}]
                          </span>
                          {word.example && (
                            <p className="text-stone-400 text-xs mt-0.5">
                              {word.example}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={handleSaveWords}
                  disabled={saving || selectedWords.size === 0}
                  className="w-full py-2.5 bg-sky-500 text-white text-sm rounded-full font-medium hover:bg-sky-600 disabled:opacity-50"
                >
                  {saving
                    ? t.scriptDetail.saving
                    : t.scriptDetail.saveSelected(selectedWords.size)}
                </button>
              </div>
            )}

            {showWords && filteredWords.length === 0 && !extracting && (
              <p className="text-sm text-stone-500">
                {extractedWords.length > 0
                  ? t.scriptDetail.noWordsAtLevel
                  : t.scriptDetail.noNewWords}
              </p>
            )}
          </div>
        </div>

        {/* 스크립트 패널 */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{t.scriptDetail.scriptHeading}</h2>
              {script.transcriptionModel === "whisper-1" && (
                <div className="flex text-sm">
                  <button
                    onClick={() => setViewMode("timeline")}
                    className={`px-2 py-0.5 rounded-l-md border ${
                      viewMode === "timeline"
                        ? "bg-stone-800 text-white border-stone-800"
                        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {t.scriptDetail.timelineView}
                  </button>
                  <button
                    onClick={() => setViewMode("full")}
                    className={`px-2 py-0.5 rounded-r-md border-t border-r border-b ${
                      viewMode === "full"
                        ? "bg-stone-800 text-white border-stone-800"
                        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {t.scriptDetail.fullView}
                  </button>
                </div>
              )}
            </div>
            {viewMode === "timeline" && ytId && (
              <button
                onClick={() => setFollowScript((prev) => !prev)}
                className={`px-3 py-1 text-sm rounded-full ${
                  followScript
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                }`}
              >
                {t.scriptDetail.autoScrollLabel}{" "}
                {followScript ? t.scriptDetail.on : t.scriptDetail.off}
              </button>
            )}
            {viewMode === "timeline" && biliId && (
              <span className="text-xs text-stone-400">
                {t.scriptDetail.bilibiliNoAutoScroll}
              </span>
            )}
          </div>
          <div
            ref={scriptContainerRef}
            className="max-h-[calc(100vh-200px)] overflow-y-auto"
          >
            {viewMode === "timeline" ? (
              script.segments.map((seg) => (
                <div
                  key={seg.id}
                  ref={(el) => {
                    if (el) segmentRefs.current.set(seg.id, el);
                  }}
                  onClick={() => seekTo(seg.startTime)}
                  className={`p-3 border-b border-stone-200 cursor-pointer hover:bg-sky-50 transition ${
                    activeSegment === seg.id ? "bg-sky-100 border-l-4 border-l-sky-400" : ""
                  }`}
                >
                  <span className="text-xs text-stone-400 font-mono">
                    {formatTime(seg.startTime)}
                  </span>
                  <p className="text-sm mt-1">{seg.originalText}</p>
                  {seg.translatedText && (
                    <p className="text-sm text-stone-500 mt-0.5">
                      {seg.translatedText}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 space-y-3">
                {script.segments.map((seg) => {
                  const originals = splitSentences(seg.originalText);
                  const translations = seg.translatedText
                    ? splitSentences(seg.translatedText)
                    : [];
                  if (
                    originals.length > 0 &&
                    originals.length === translations.length
                  ) {
                    return originals.map((orig, i) => (
                      <div key={`${seg.id}-${i}`}>
                        <p className="text-sm leading-relaxed">{orig}</p>
                        <p className="text-sm leading-relaxed text-stone-500 mt-0.5">
                          {translations[i]}
                        </p>
                      </div>
                    ));
                  }
                  return (
                    <div key={seg.id}>
                      <p className="text-sm leading-relaxed">
                        {seg.originalText}
                      </p>
                      {seg.translatedText && (
                        <p className="text-sm leading-relaxed text-stone-500 mt-0.5">
                          {seg.translatedText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
