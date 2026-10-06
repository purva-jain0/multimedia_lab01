import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, Sparkles, User, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function AudioResultCard({ result, onClear }) {
  const [isPlayingInput, setIsPlayingInput] = useState(false);
  const [isPlayingOutput, setIsPlayingOutput] = useState(false);
  const [inputCurrentTime, setInputCurrentTime] = useState(0);
  const [inputDuration, setInputDuration] = useState(0);
  const [outputCurrentTime, setOutputCurrentTime] = useState(0);
  const [outputDuration, setOutputDuration] = useState(0);

  const inputAudioRef = useRef(null);
  const outputAudioRef = useRef(null);

  // Auto-play the transformed voice when result changes
  useEffect(() => {
    if (result && result.output_audio_url && outputAudioRef.current) {
      outputAudioRef.current.currentTime = 0;
      outputAudioRef.current.play().then(() => {
        setIsPlayingOutput(true);
      }).catch((err) => {
        console.log("Auto-play prevented by browser policy (user must interact first):", err);
      });
    }
  }, [result]);

  const togglePlayInput = () => {
    if (!inputAudioRef.current) return;
    if (isPlayingInput) {
      inputAudioRef.current.pause();
      setIsPlayingInput(false);
    } else {
      if (outputAudioRef.current && isPlayingOutput) {
        outputAudioRef.current.pause();
        setIsPlayingOutput(false);
      }
      inputAudioRef.current.play();
      setIsPlayingInput(true);
    }
  };

  const togglePlayOutput = () => {
    if (!outputAudioRef.current) return;
    if (isPlayingOutput) {
      outputAudioRef.current.pause();
      setIsPlayingOutput(false);
    } else {
      if (inputAudioRef.current && isPlayingInput) {
        inputAudioRef.current.pause();
        setIsPlayingInput(false);
      }
      outputAudioRef.current.play();
      setIsPlayingOutput(true);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!result) return null;

  return (
    <div className="glass-panel" style={{
      padding: '1.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      border: '1px solid rgba(99, 102, 241, 0.4)',
      boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)'
    }}>
      {/* Hidden audio elements */}
      <audio
        ref={inputAudioRef}
        src={result.input_audio_url}
        onTimeUpdate={() => setInputCurrentTime(inputAudioRef.current.currentTime)}
        onLoadedMetadata={() => setInputDuration(inputAudioRef.current.duration)}
        onEnded={() => setIsPlayingInput(false)}
      />
      <audio
        ref={outputAudioRef}
        src={result.output_audio_url}
        onTimeUpdate={() => setOutputCurrentTime(outputAudioRef.current.currentTime)}
        onLoadedMetadata={() => setOutputDuration(outputAudioRef.current.duration)}
        onEnded={() => setIsPlayingOutput(false)}
      />

      {/* Header with success badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <CheckCircle2 size={24} color="#10b981" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Voice Transformation Ready!</h3>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a
            href={result.output_audio_url}
            download={`voice_transformed_${result.voice_name || 'sound'}.mp3`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Download Audio</span>
          </a>

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-faint)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear Result"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Success / Warning Notice */}
      {result.warning && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '0.8rem',
          color: '#fbbf24'
        }}>
          {result.warning}
        </div>
      )}

      {/* Audio Players Comparison Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        {/* Output: Transformed Voice (Featured) */}
        <div style={{
          padding: '1.25rem',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                TRANSFORMED SOUND
              </span>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.4)',
              color: '#ffffff'
            }}>
              {result.voice_name || 'AI Voice'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={togglePlayOutput}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}
            >
              {isPlayingOutput ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <input
                type="range"
                min="0"
                max={outputDuration || 1}
                step="0.05"
                value={outputCurrentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setOutputCurrentTime(val);
                  if (outputAudioRef.current) outputAudioRef.current.currentTime = val;
                }}
                style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>{formatTime(outputCurrentTime)}</span>
                <span>{formatTime(outputDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input: Original Recorded Voice */}
        <div style={{
          padding: '1.25rem',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                ORIGINAL (YOUR VOICE)
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
              Microphone
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={togglePlayInput}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff'
              }}
            >
              {isPlayingInput ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <input
                type="range"
                min="0"
                max={inputDuration || 1}
                step="0.05"
                value={inputCurrentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setInputCurrentTime(val);
                  if (inputAudioRef.current) inputAudioRef.current.currentTime = val;
                }}
                style={{ width: '100%', accentColor: 'var(--text-muted)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                <span>{formatTime(inputCurrentTime)}</span>
                <span>{formatTime(inputDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
