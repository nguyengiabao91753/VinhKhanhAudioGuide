import React, { useEffect, useState } from "react";
import { NarrationService } from "./../features/narration/NarrationService";

interface AudioPlayerProps {
  className?: string;
}

export const NarrationPlayer: React.FC<AudioPlayerProps> = ({
  className = "",
}) => {
  const [state, setState] = useState({
    isPlaying: false,
    isPaused: false,
    currentPoi: null as any,
    currentTime: 0,
    duration: 0,
    isLoading: false,
  });

  useEffect(() => {
    const service = NarrationService.getInstance();
    const unsubscribe = service.subscribe((s) => {
      setState((prev) => ({
        ...prev,
        ...s,
      }));
    });
    return unsubscribe;
  }, []);

  const service = NarrationService.getInstance();

  const handlePlayPause = () => {
    if (state.isPlaying) {
      service.pause();
    } else if (state.isPaused) {
      service.resume();
    }
  };

  const handleStop = () => {
    service.pause();
  };

//   const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const time = parseFloat(e.target.value);
//     service(time);
//   };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!state.currentPoi) {
    return null;
  }

  return (
    <div className={`narration-player ${className}`}>
      <div className="player-info">
        <h4>{state.currentPoi.name}</h4>
        {state.isLoading && <span className="loading">Đang tải...</span>}
      </div>

      <div className="player-controls">
        <button
          onClick={handlePlayPause}
          disabled={state.isLoading}
          className="btn-play-pause">
          {state.isPlaying ? "⏸ Tạm dừng" : "▶ Phát"}
        </button>

        <button
          onClick={handleStop}
          disabled={state.isLoading}
          className="btn-stop">
          ⏹ Dừng
        </button>
      </div>

      <div className="player-progress">
        <span className="time-current">{formatTime(state.currentTime)}</span>

        <input
          type="range"
          min="0"
          max={state.duration || 0}
          value={state.currentTime}
        //   onChange={handleSeek}
          disabled={!state.duration || state.isLoading}
          className="progress-slider"
          title="Seek audio playback"
          aria-label="Seek audio playback"
        />

        <span className="time-duration">{formatTime(state.duration)}</span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{
            width: state.duration
              ? `${(state.currentTime / state.duration) * 100}%`
              : "0%",
          }}
        />
      </div>
    </div>
  );
};
