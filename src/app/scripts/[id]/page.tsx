"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

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

export default function ScriptDetailPage() {
  const params = useParams();
  const scriptId = params.id as string;

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch script data
  useEffect(() => {
    fetch(`/api/scripts/${scriptId}`)
      .then((res) => res.json())
      .then((data) => setScript(data))
      .catch(console.error);
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

    return () => stopTimeTracking();
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
          const el = segmentRefs.current.get(seg.id);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        setShowWords(true);
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
        alert(`${wordsToSave.length}개 단어가 단어장에 저장되었습니다.`);
        setShowWords(false);
        setExtractedWords([]);
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
        <p className="text-gray-500">스크립트를 불러오는 중...</p>
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
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
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
              <div className="flex items-center justify-center h-full text-gray-400">
                영상을 임베드할 수 없습니다
              </div>
            )}
          </div>

          {/* 단어 추출 패널 */}
          <div className="mt-4 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={handleExtractWords}
                disabled={extracting}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {extracting ? "추출 중..." : "단어 추출하기"}
              </button>
              {showWords && extractedWords.length > 0 && (
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setSelectedWords(new Set());
                  }}
                  className="px-3 py-1.5 border rounded-md text-sm"
                >
                  <option value="beginner">초급</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">고급</option>
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
                      <p className="text-xs text-gray-400">
                        전체 {extractedWords.length}개 중 {filteredWords.length}개 표시
                      </p>
                      <button
                        onClick={toggleAll}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {allSelected ? "전체 해제" : "전체 선택"}
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
                        className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
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
                            <span className="text-gray-500 ml-1">
                              ({word.reading})
                            </span>
                          )}
                          <span className="text-gray-700 ml-2">
                            {word.meaning}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">
                            [{word.difficulty}]
                          </span>
                          {word.example && (
                            <p className="text-gray-400 text-xs mt-0.5">
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
                  className="w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "저장 중..."
                    : `선택한 ${selectedWords.size}개 단어 저장하기`}
                </button>
              </div>
            )}

            {showWords && filteredWords.length === 0 && !extracting && (
              <p className="text-sm text-gray-500">
                {extractedWords.length > 0
                  ? "현재 레벨에 해당하는 단어가 없습니다. 레벨을 변경해보세요."
                  : "추출할 새로운 단어가 없습니다."}
              </p>
            )}
          </div>
        </div>

        {/* 스크립트 패널 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold">스크립트</h2>
              <div className="flex text-sm">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`px-2 py-0.5 rounded-l-md border ${
                    viewMode === "timeline"
                      ? "bg-gray-700 text-white border-gray-700"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  타임라인
                </button>
                <button
                  onClick={() => setViewMode("full")}
                  className={`px-2 py-0.5 rounded-r-md border-t border-r border-b ${
                    viewMode === "full"
                      ? "bg-gray-700 text-white border-gray-700"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  전체보기
                </button>
              </div>
            </div>
            {viewMode === "timeline" && (
              <button
                onClick={() => setFollowScript((prev) => !prev)}
                className={`px-3 py-1 text-sm rounded-md ${
                  followScript
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                자동 스크롤 {followScript ? "ON" : "OFF"}
              </button>
            )}
          </div>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {viewMode === "timeline" ? (
              script.segments.map((seg) => (
                <div
                  key={seg.id}
                  ref={(el) => {
                    if (el) segmentRefs.current.set(seg.id, el);
                  }}
                  onClick={() => seekTo(seg.startTime)}
                  className={`p-3 border-b cursor-pointer hover:bg-blue-50 transition ${
                    activeSegment === seg.id ? "bg-blue-100 border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(seg.startTime)}
                  </span>
                  <p className="text-sm mt-1">{seg.originalText}</p>
                  {seg.translatedText && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {seg.translatedText}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">원문</h3>
                  <p className="text-sm leading-relaxed">
                    {script.segments.map((seg) => seg.originalText).join(" ")}
                  </p>
                </div>
                <hr />
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">번역</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {script.segments.map((seg) => seg.translatedText).join(" ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
