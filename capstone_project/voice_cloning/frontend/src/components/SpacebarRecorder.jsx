import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Radio, Sparkles, Volume2 } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

export default function SpacebarRecorder({ onRecordingComplete, isProcessing, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordMode, setRecordMode] = useState('hold'); // 'hold' or 'toggle'
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaStream, setMediaStream] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const recordModeRef = useRef('hold');

  // Keep refs synced to avoid stale closures in event listeners
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    recordModeRef.current = recordMode;
  }, [recordMode]);

  // Start recording
  const startRecording = async () => {
    if (isRecordingRef.current || isProcessing || disabled) return;
    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setMediaStream(stream);

      // Determine supported mime type
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/wav'];
      let selectedMime = '';
      for (const t of mimeTypes) {
        if (MediaRecorder.isTypeSupported(t)) {
          selectedMime = t;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationSec = (Date.now() - recordingStartTimeRef.current) / 1000;
        const mime = selectedMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        // Clean up stream tracks
        stream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);

        if (durationSec < 0.6) {
          setMicError("Recording was too short. Please speak a sentence and release.");
          return;
        }

        onRecordingComplete(audioBlob, durationSec);
      };

      recorder.start(100);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((Date.now() - recordingStartTimeRef.current) / 1000);
      }, 50);

    } catch (err) {
      console.error("Microphone access error:", err);
      setMicError("Microphone access denied. Please grant permission in browser settings.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Global Spacebar Key Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.target?.isContentEditable) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scrolling

        if (e.repeat) return; // Ignore auto-repeat keypress

        setIsSpacePressed(true);

        if (recordModeRef.current === 'hold') {
          if (!isRecordingRef.current) {
            startRecording();
          }
        } else {
          // Toggle mode
          if (isRecordingRef.current) {
            stopRecording();
          } else {
            startRecording();
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsSpacePressed(false);

        if (recordModeRef.current === 'hold' && isRecordingRef.current) {
          stopRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [disabled, isProcessing]);

  // Format seconds into MM:SS.S
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s}.${ms}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Glow background on active recording */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      )}

      {/* Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setRecordMode('hold')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: recordMode === 'hold' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
            background: recordMode === 'hold' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: recordMode === 'hold' ? '#a5b4fc' : 'var(--text-muted)'
          }}
        >
          Push-to-Talk (Hold Space)
        </button>
        <button
          type="button"
          onClick={() => setRecordMode('toggle')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: recordMode === 'toggle' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
            background: recordMode === 'toggle' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            color: recordMode === 'toggle' ? '#a5b4fc' : 'var(--text-muted)'
          }}
        >
          Toggle Mode (Tap Space)
        </button>
      </div>

      {/* Main Recording Centerpiece */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (isRecording) stopRecording();
            else startRecording();
          }}
          className={isRecording ? 'recording-glow' : ''}
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isRecording
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: isRecording
              ? '0 0 35px rgba(239, 68, 68, 0.6)'
              : '0 10px 25px rgba(79, 70, 229, 0.35)',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
        >
          {isRecording ? (
            <Square size={42} color="#ffffff" fill="#ffffff" />
          ) : (
            <Mic size={48} color="#ffffff" />
          )}
        </div>

        {/* Spacebar Prompt Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
          <span className={`spacebar-badge ${isSpacePressed ? 'active' : ''}`}>
            SPACEBAR
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: isRecording ? '#f87171' : '#cbd5e1' }}>
            {isRecording
              ? (recordMode === 'hold' ? 'Release Spacebar to Transform' : 'Press Spacebar to Stop')
              : (recordMode === 'hold' ? 'Hold Spacebar to Record' : 'Press Spacebar to Start')}
          </span>
        </div>

        {/* Live Audio Visualizer or Recording Status */}
        {isRecording ? (
          <div style={{ width: '100%', maxWidth: '420px', marginTop: '0.5rem' }}>
            <AudioVisualizer stream={mediaStream} isRecording={isRecording} />
            <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>
              🔴 {formatTime(recordingTime)}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>
            Speak naturally into your microphone. Release or stop to receive instant voice transformation!
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '30px',
            color: '#a5b4fc',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginTop: '0.5rem'
          }}>
            <Sparkles size={18} className="animate-spin" />
            <span>ElevenLabs AI is morphing your voice...</span>
          </div>
        )}

        {/* Error Notification */}
        {micError && (
          <div style={{
            color: '#f87171',
            fontSize: '0.85rem',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            {micError}
          </div>
        )}
      </div>
    </div>
  );
}
