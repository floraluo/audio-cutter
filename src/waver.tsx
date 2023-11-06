import clsx from 'clsx';
import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import getPeaks from './peaks';
import { Pos } from './dragger';
export interface Distance {
  xRange: number;
  yRange: number;
}

const dpr = window.devicePixelRatio || 1;

interface AudioWaveProps {
  className?: string;
  audioBuffer: AudioBuffer;
  width: number;
  height: number;
  left: number;
  containerWidth: number;
  color1?: string;
  color2?: string;
  onMove(Distance: {
    xRange: number;
    yRange: number;
  }): void;
}

function AudioWave({
  width,
  height,
  left,
  containerWidth,
  color1 = '#ccc',
  color2 = '#ddd',
  audioBuffer,
  className,
  onMove
}: AudioWaveProps) {
  const deviceWidth = width * dpr;
  const PreviousPos: Pos = {
    x: 0,
    y: 0
  }
  const peaks = useMemo(
    () => getPeaks(Math.floor(deviceWidth), audioBuffer.getChannelData(0)),
    [audioBuffer, deviceWidth],
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const paint = () => {
    const ctx = canvasRef.current?.getContext('2d');
    const count = peaks[0].length;
    const centerY = (height / 2) * dpr;
    if (!ctx) return;

    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, deviceWidth, height * dpr);

    for (let i = 0; i < count; i += 1) {
      const min = peaks[0][i];
      const max = peaks[1][i];
      const x = i - 0.5;

      ctx.beginPath();
      ctx.strokeStyle = color1;
      ctx.moveTo(x, centerY + (centerY * min) + 0.5);
      ctx.lineTo(x, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = color2;
      ctx.moveTo(x, centerY);
      ctx.lineTo(x, centerY + (centerY * max) + 0.5);
      ctx.stroke();
    }
  };

  useEffect(() => {
    paint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    paint();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const handleMouseDown = (e0: React.MouseEvent) => {
    let { screenX, screenY } = e0;

    const handleMouseMove = (e: MouseEvent) => {
      // console.log('e.screenX - screenX :>> ', e.screenX - screenX);
      const xRange = e.screenX - screenX;
      if (
        xRange > 0 && xRange >= Math.abs(left) ||
        xRange < 0 && xRange >= (width - containerWidth - Math.abs(left))
      ) {
        // screenX = e.screenX;
        // screenY = e.screenY;
        // return;
      }
      onMove({
        xRange,
        yRange: e.screenY - screenY,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <canvas
      ref={canvasRef}
      className={clsx('wave-canvas', className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${left}px`
      }}
      width={width * dpr}
      height={height * dpr}
      onMouseDown={handleMouseDown}
    />
  );
}

export default memo(AudioWave);
