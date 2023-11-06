import React from 'react';
import ReactDOM from 'react-dom';
import Player, { clamp } from './player';
import FilePicker from './file';
import Icon from './icon';
import {
  isAudio, readBlobURL, download, rename,
} from './utils';
import { decodeAudioBuffer, sliceAudioBuffer } from './audio-helper';
import encode from './worker-client';
import './index.less';
import {
  downloadIcon,
  musicIcon,
  pauseIcon,
  playIcon,
  replayIcon,
  spinIcon,
} from './icons';
import { useClassicState } from './hooks';
import { SUpportedFormat } from './types';

interface ContainerTimeRange{
  containerStartTime: number;
  containerEndTime: number;
}
function containerTimeRange(state: any, left: number):ContainerTimeRange { 
  const { containerWidth, waverWidth, duration, zoomRange } = state;
  const zoomWaverWidth = waverWidth + zoomRange;
  const time2WidthRatio = duration / zoomWaverWidth;
  // const containerEndTime = (1000 + Math.abs(left)) * time2WidthRatio;
  // const containerStartTime = Math.abs(left) * time2WidthRatio;
  return {
    containerStartTime: Math.abs(left) * time2WidthRatio,
    containerEndTime: (containerWidth + Math.abs(left)) * time2WidthRatio
  }
}
function App() {
  const [state, setState] = useClassicState<{
    file: File | null;
    decoding: boolean;
    audioBuffer: AudioBuffer | null;
    paused: boolean;
    zoomRange: number;
    startTime: number;
    endTime: number;
    duration: number;
    currentTime: number;
    containerWidth: number;
    waverWidth: number;
    left: number;
    processing: boolean;
  }>({
    file: null,
    decoding: false,
    audioBuffer: null,
    zoomRange: 100,
    paused: true,
    startTime: 0,
    endTime: Infinity,
    duration: Infinity,
    currentTime: 0,
    containerWidth: 1000,
    waverWidth: 1000,
    left: 0,
    processing: false,
  });

  const handleFileChange = async (file: File) => {
    console.log('file :>> ', file);
    if (!isAudio(file)) {
      alert('请选择合法的音频文件');
      return;
    }

    setState({
      file,
      paused: true,
      decoding: true,
      audioBuffer: null,
    });

    const audioBuffer = await decodeAudioBuffer(file);

    setState({
      paused: false,
      decoding: false,
      audioBuffer,
      startTime: 0,
      currentTime: 0,
      endTime: audioBuffer.duration / 2,
      duration: audioBuffer.duration,
    });
  };

  const handleStartTimeChange = (time: number) => {
    setState({
      startTime: time,
    });
  };

  const handleEndTimeChange = (time: number) => {
    setState({
      endTime: time,
    });
  };

  const handleCurrentTimeChange = (time: number) => {
    setState({
      currentTime: time,
    });
  };

  const handleWaverMove = (distance: number) => {
    const { startTime, currentTime, endTime, duration, containerWidth, waverWidth, left } = state;
    const width2DurationRatio = waverWidth / duration;
    const leftAfterMove = clamp(left + distance, containerWidth - waverWidth, 0);
    const moveTimeRange = (leftAfterMove - left) / width2DurationRatio;
    const startTimeAfterMove = startTime - moveTimeRange;
    const currentTimeAfterMove = currentTime - moveTimeRange;
    const endTimeAfterMove = endTime - moveTimeRange;
    setState({
      startTime: startTimeAfterMove,
      currentTime: currentTimeAfterMove,
      endTime: endTimeAfterMove,
      left: leftAfterMove
    });
  }

  const handleEnd = () => {
    setState({
      currentTime: state.startTime,
      paused: false,
    });
  };

  const handlePlayPauseClick = () => {
    setState({
      paused: !state.paused,
    });
  };

  const handleReplayClick = () => {
    setState({
      currentTime: state.startTime,
      paused: false,
    });
  };
  const handleZoomOutClick = () => {
    const { containerWidth, waverWidth, zoomRange} = state;
    const zoomWaverWidth = waverWidth - zoomRange;
    const left = state.left + zoomRange/2;
    setState({
      waverWidth: zoomWaverWidth > containerWidth ? zoomWaverWidth : containerWidth,
      left: left > 0 ? 0 : left,
    });
  }
  const handleZoomInClick = () => {
    const { waverWidth, zoomRange, left, startTime, endTime, currentTime } = state;
    const zoomLeft = left - (zoomRange / 2)
    const { containerStartTime, containerEndTime } = containerTimeRange(state, zoomLeft)
    // const zoomStartTime = startTime < containerStartTime
    //   ? containerStartTime
    //   : startTime > containerEndTime
    //     ? containerEndTime
    //     : startTime;
    const zoomStartTime = clamp(startTime, containerStartTime, containerEndTime)
    const zoomEndTime = clamp(endTime, containerStartTime, containerEndTime)
    // const zoomEndTime = endTime < containerStartTime
    //   ? containerStartTime
    //   : endTime > containerEndTime
    //     ? containerEndTime
    //     : endTime; 
    const zoomCurrentTime = clamp(currentTime, zoomStartTime, zoomEndTime)
    // const zoomCurrentTime = currentTime < zoomStartTime
    //   ? zoomStartTime 
    //   : currentTime > zoomEndTime
    //     ? zoomEndTime
    //     : currentTime;
    setState({
      waverWidth: waverWidth + zoomRange,
      left: zoomLeft,
      startTime: zoomStartTime,
      endTime: zoomEndTime,
      currentTime: zoomCurrentTime
    });
  }
  const handleEncode = (type: SUpportedFormat) => {
    const {
      startTime, endTime, audioBuffer, file,
    } = state;
    if (!audioBuffer || !file) return;

    const { length, duration } = audioBuffer;

    const audioSliced = sliceAudioBuffer(
      audioBuffer,
      Math.floor(length * startTime / duration),
      Math.floor(length * endTime / duration),
    );

    setState({
      processing: true,
    });

    encode(audioSliced, type)
      .then(readBlobURL)
      .then((url) => {
        download(url, rename(file.name, type));
      })
      .catch((e) => console.error(e))
      .then(() => {
        setState({
          processing: false,
        });
      });
  };

  const displaySeconds = (seconds: number) => `${seconds.toFixed(2)}s`;

  return (
    <div className="container">
      {
        state.audioBuffer || state.decoding ? (
          <div>
            {/* <h2 className="app-title">Audio Cutter</h2> */}

            {
              state.decoding ? (
                <div className="player player-landing">
                  DECODING...
                </div>
              ) : (
                <Player
                  audioBuffer={state.audioBuffer!}
                  blob={state.file!}
                  paused={state.paused}
                  startTime={state.startTime}
                  endTime={state.endTime}
                  currentTime={state.currentTime}
                  waverWidth={state.waverWidth}
                  containerWidth={state.containerWidth}
                  left={state.left}
                  onStartTimeChange={handleStartTimeChange}
                  onEndTimeChange={handleEndTimeChange}
                  onCurrentTimeChange={handleCurrentTimeChange}
                  onWaverMove={handleWaverMove}
                  onEnd={handleEnd}
                />
              )
            }

            <div className="controllers">
              <FilePicker className="ctrl-item" onPick={handleFileChange}>
                <Icon icon={musicIcon} />
              </FilePicker>

              <button
                type="button"
                className="ctrl-item"
                title="Play/Pause"
                onClick={handlePlayPauseClick}
              >
                <Icon icon={state.paused ? playIcon : pauseIcon} />
              </button>

              <button
                type="button"
                className="ctrl-item"
                title="Replay"
                onClick={handleReplayClick}
              >
                <Icon icon={replayIcon} />
              </button>
              <button
                type="button"
                className="ctrl-item"
                title="缩小"
                onClick={handleZoomOutClick}
              >
                -
              </button>
              <button
                type="button"
                className="ctrl-item"
                title="放大"
                onClick={handleZoomInClick}
              >
                +
              </button>
              <div className="dropdown list-wrap">
                <button
                  type="button"
                  className="ctrl-item"
                >
                  <Icon icon={state.processing ? spinIcon : downloadIcon} />
                </button>
                {
                  !state.processing && (
                    <ul className="list">
                      {/* <li>
                        <button
                          type="button"
                          onClick={() => handleEncode('wav')}
                        >
                          Wav
                        </button>
                      </li> */}
                      <li>
                        <button
                          type="button"
                          onClick={() => handleEncode('mp3')}
                          data-type="mp3"
                        >
                          MP3
                        </button>
                      </li>
                    </ul>
                  )
                }
              </div>

              {
                Number.isFinite(state.endTime)
                && (
                <span className="seconds">
                  总时长:
                  {' '}
                  <span className="seconds-total">
                    {
                    displaySeconds(state.audioBuffer?.duration ?? 0)
                  }
                  </span>
                  {'  '}
                  选中:
                  {' '}
                  <span className="seconds-range">
                    {
                    displaySeconds(state.endTime - state.startTime)
                  }
                  </span>
                  {' '}
                  (开始时间
                  {' '}
                  <span className="seconds-start">
                    {
                    displaySeconds(state.startTime)
                  }
                  </span>
                  {' '}
                  结束时间
                  {' '}
                  <span className="seconds-end">
                  {
                    displaySeconds(state.endTime)
                  }
                  <input type="text" />
                  </span>
                  )
                </span>
                )
              }
            </div>
          </div>
        ) : (
            <div className="landing">
              <input type="text" />
            <h2>Audio Cutter</h2>
            <FilePicker onPick={handleFileChange}>
              <div className="file-main">
                <Icon icon={musicIcon} />
                Select music file
              </div>
            </FilePicker>
          </div>
        )
      }
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('main'));
