/* eslint-disable jsx-a11y/media-has-caption */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import Waver, { Distance } from './waver';
import Dragger, { Pos } from './dragger';
import { formatSeconds } from './utils';
import { useRaf } from './hooks';

// const containerWidth = 1000;
const containerHeight = 160;

export function clamp(x: number, min: number, max: number) {
  if (x < min) {
    return min;
  }

  if (x > max) {
    return max;
  }

  return x;
}

function getClipRect(start: number, end: number) {
  return `rect(0, ${end}px, ${containerHeight}px, ${start}px)`;
}

const color1 = '#0cf';
const color2 = '#1ad1ff';
const gray1 = '#ddd';
const gray2 = '#e3e3e3';

interface PlayerProps {
  blob: Blob;
  audioBuffer: AudioBuffer;
  paused: boolean;
  startTime: number;
  endTime: number;
  currentTime: number;
  waverWidth: number;
  containerWidth: number;
  left: number;
  onStartTimeChange(time: number): void;
  onEndTimeChange(time: number): void;
  onCurrentTimeChange(time: number): void;
  onWaverMove(distance: number): void;
  onEnd(): void;
}

export default function Player({
  blob,
  audioBuffer,
  startTime,
  endTime,
  currentTime,
  waverWidth,
  containerWidth,
  left,
  paused,
  onStartTimeChange,
  onEndTimeChange,
  onCurrentTimeChange,
  onWaverMove,
  onEnd,
}: PlayerProps) {
  const widthDurationRatio = waverWidth / audioBuffer.duration;
  const time2pos = (time: number) => time * widthDurationRatio + left;
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTimeRef = useRef<number>();

  const pos2Time = useCallback(
    (pos: number) => (pos + Math.abs(left)) / widthDurationRatio,
    [left, widthDurationRatio],
  );
  const distance2Time = useCallback(
    (distance: number) => distance / widthDurationRatio,
    [widthDurationRatio],
  );

  const clampTime = useCallback(
    // (time: number) => clamp(time, 0, audioBuffer.duration),
    // [audioBuffer.duration],
    (time: number) => clamp(time, pos2Time(0), pos2Time(1000)),
    [pos2Time],
  );

  let start = time2pos(startTime);
  let end = time2pos(endTime);
  let current = time2pos(currentTime);

  const currentTimeFormatted = formatSeconds(currentTime);

  const handleDragStart = useCallback(({ x }: Pos) => {
    onStartTimeChange(clampTime(pos2Time(x)));
  }, [clampTime, onStartTimeChange, pos2Time]);

  const handleDragEnd = useCallback(({ x }: Pos) => {
    onEndTimeChange(clampTime(pos2Time(x)));
  }, [clampTime, onEndTimeChange, pos2Time]);

  const handleDragCurrent = useCallback(({ x }: Pos) => {
    onCurrentTimeChange(clampTime(pos2Time(x)));
  }, [clampTime, onCurrentTimeChange, pos2Time]);
  const handleWaverMove = useCallback(({ xRange }: Distance) => {
    onWaverMove(xRange);
  }, [clampTime, onWaverMove])
  
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime: time } = audioRef.current;
    if (time === currentTime) return;
    onCurrentTimeChange(time);
    if (time >= endTime && currentTime < endTime) {
      onEnd();
    }
    currentTimeRef.current = time;
  };

  const handleEnded = () => {
    onEnd();
  };

  const url = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;

    if (paused) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [paused]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio?.src) return;

    if (currentTimeRef.current !== currentTime) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    start = time2pos(startTime);
    end = time2pos(endTime);
    current = time2pos(currentTime);
  }, [waverWidth]);

  useRaf(handleTimeUpdate);

  return (
    <div className="player">
      <audio
        hidden
        src={url}
        ref={audioRef}
        onEnded={handleEnded}
      />
      <div className="clipper">
        <Waver
          audioBuffer={audioBuffer}
          width={waverWidth}
          containerWidth={containerWidth}
          left={left}
          height={containerHeight}
          color1={gray1}
          color2={gray2}
          onMove={handleWaverMove}
        />
      </div>
      <div
        className="clipper"
        style={{ clip: getClipRect(start, end) }}
      >
        <Waver
          audioBuffer={audioBuffer}
          width={waverWidth}
          containerWidth={containerWidth}
          left={left}
          height={containerHeight}
          color1={color1}
          color2={color2}
          onMove={handleWaverMove}
        />
      </div>
      <Dragger
        x={start}
        value={startTime}
        onDrag={handleDragStart}
      />
      <Dragger
        className="drag-current"
        x={current}
        value={currentTime}
        onDrag={handleDragCurrent}
      >
        <div className="cursor-current">
          <span className="num">{currentTimeFormatted[0]}</span>
          &apos;
          <span className="num">{currentTimeFormatted[1]}</span>
          .
          <span className="num">{currentTimeFormatted[2].toString().padStart(2, '0')}</span>
        </div>
      </Dragger>
      <Dragger
        x={end}
        value={endTime}
        onDrag={handleDragEnd}
      />
    </div>
  );
}
