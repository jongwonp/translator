declare namespace YT {
  class Player {
    constructor(
      element: string | HTMLElement,
      options: {
        videoId: string;
        height?: string | number;
        width?: string | number;
        playerVars?: Record<string, unknown>;
        events?: {
          onStateChange?: (event: OnStateChangeEvent) => void;
          onReady?: (event: { target: Player }) => void;
        };
      }
    );
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    getCurrentTime(): number;
    getPlayerState(): number;
    destroy(): void;
  }

  interface OnStateChangeEvent {
    data: number;
    target: Player;
  }

  const PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: (() => void) | undefined;
}
