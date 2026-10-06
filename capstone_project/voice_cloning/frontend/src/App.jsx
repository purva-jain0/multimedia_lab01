import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Play, Pause, Download, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultAudioUrl, setResultAudioUrl] = useState(null);
  const [isPlayingResult, setIsPlayingResult] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Hold Spacebar to speak');
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const audioPlayerRef = useRef(null);

  // Keep ref synced
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Load voices from backend on start
  useEffect(() => {
    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        const voiceList = data.voices || [];
        setVoices(voiceList);
        if (voiceList.length > 0) {
          setSelectedVoiceId(voiceList[0].voice_id);
        }
      })
      .catch((err) => {
        console.error("Error loading voices:", err);
      });
  }, []);

  // Spacebar Global Listener (Hold to record, release to transform)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return;
        setIsSpacePressed(true);
        if (!isRecordingRef.current && !isProcessing) {
          startRecording();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsSpacePressed(false);
        if (isRecordingRef.current) {
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
  }, [isProcessing, selectedVoiceId, voices]);

  // Start audio recording
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        stream.getTracks().forEach((track) => track.stop());

        if (duration < 0.6) {
          setErrorMessage("Recording was too short. Speak a full phrase.");
          setStatusMessage("Hold Spacebar to speak");
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        transformAudio(blob);
      };

      recorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setStatusMessage("Recording... Speak now!");
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((Date.now() - recordingStartTimeRef.current) / 1000);
      }, 50);
    } catch (err) {
      console.error(err);
      setErrorMessage("Microphone access denied. Please allow microphone in browser.");
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

  // Send audio to backend and receive transformed voice
  const transformAudio = async (blob) => {
    setIsProcessing(true);
    setStatusMessage("Transforming voice with ElevenLabs AI...");

    const selectedVoiceObj = voices.find((v) => v.voice_id === selectedVoiceId) || voices[0];
    const formData = new FormData();
    formData.append('audio', blob, 'speech.webm');
    formData.append('voice_id', selectedVoiceObj?.voice_id || 'pNInz6obpgDQGcFmaJgB');
    formData.append('voice_name', selectedVoiceObj?.name || 'Target Voice');
    formData.append('mode', 'elevenlabs');

    try {
      const res = await fetch('/api/transform-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Transformation failed.");
      }

      setResultAudioUrl(data.output_audio_url);
      setStatusMessage(`Transformed into: ${data.voice_name || selectedVoiceObj?.name}!`);

      // Auto-play the transformed voice
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = data.output_audio_url;
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().then(() => {
          setIsPlayingResult(true);
        }).catch((err) => {
          console.log("Auto-play wait for user interaction:", err);
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      setStatusMessage("Hold Spacebar to speak");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayResult = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingResult) {
      audioPlayerRef.current.pause();
      setIsPlayingResult(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingResult(true);
    }
  };

  const currentVoiceObj = voices.find((v) => v.voice_id === selectedVoiceId);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 65%, #05070a 100%)',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      color: '#ffffff'
    }}>
      {/* Hidden audio player for automatic playback */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setIsPlayingResult(false)}
      />

      {/* Center Card */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.75rem',
        textAlign: 'center'
      }}>

        {/* Title */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.2)',
            color: '#a5b4fc',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            border: '1px solid rgba(99, 102, 241, 0.35)'
          }}>
            <Sparkles size={14} />
            <span>ELEVENLABS VOICE MORPH</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Voice Cloning Studio
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.4rem', margin: 0 }}>
            Hold the spacebar to talk &bull; hear your voice transformed in real-time
          </p>
        </div>

        {/* Voice Selector Dropdown */}
        <div style={{ width: '100%', textAlign: 'left' }}>
          <label style={{
            display: 'block',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#cbd5e1',
            marginBottom: '0.4rem'
          }}>
            Select Target Voice:
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              disabled={isRecording || isProcessing}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id} style={{ background: '#0f172a', color: '#ffffff' }}>
                  {v.name} {v.gender ? `(${v.gender})` : ''} {v.accent ? `- ${v.accent}` : ''}
                </option>
              ))}
            </select>
            <div style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#94a3b8',
              fontSize: '0.8rem'
            }}>
              ▼
            </div>
          </div>
          {currentVoiceObj?.description && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
              {currentVoiceObj.description}
            </div>
          )}
        </div>

        {/* Big Central Spacebar Recording Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <div
            role="button"
            tabIndex={0}
            onMouseDown={() => { if (!isRecording && !isProcessing) startRecording(); }}
            onMouseUp={() => { if (isRecording) stopRecording(); }}
            onTouchStart={(e) => { e.preventDefault(); if (!isRecording && !isProcessing) startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); if (isRecording) stopRecording(); }}
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              background: isRecording
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : (isProcessing
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)'),
              boxShadow: isRecording
                ? '0 0 45px rgba(239, 68, 68, 0.7)'
                : '0 12px 30px rgba(79, 70, 229, 0.4)',
              border: isSpacePressed || isRecording
                ? '4px solid #ffffff'
                : '3px solid rgba(255, 255, 255, 0.25)',
              transform: isSpacePressed || isRecording ? 'scale(1.06)' : 'scale(1)',
              transition: 'all 0.15s ease',
              cursor: isProcessing ? 'wait' : 'pointer',
              userSelect: 'none'
            }}
          >
            <Mic size={48} color="#ffffff" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.05em' }}>
              {isRecording ? `${recordingTime.toFixed(1)}s` : (isProcessing ? 'PROCESSING' : 'HOLD')}
            </span>
          </div>

          {/* Spacebar Instruction Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              className={`spacebar-badge ${isSpacePressed || isRecording ? 'active' : ''}`}
              style={{
                padding: '6px 14px',
                background: isSpacePressed ? 'linear-gradient(180deg, #4f46e5, #3730a3)' : '#1e293b',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              SPACEBAR
            </span>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: isRecording ? '#f87171' : (isProcessing ? '#a5b4fc' : '#e2e8f0')
            }}>
              {statusMessage}
            </span>
          </div>

          {errorMessage && (
            <div style={{
              color: '#f87171',
              fontSize: '0.8rem',
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Transformed Voice Response Player */}
        {resultAudioUrl && (
          <div style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button
                type="button"
                onClick={togglePlayResult}
                style={{
                  width: '44px',
                  height: '44px',
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
                {isPlayingResult ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
              </button>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                  Transformed Sound Ready
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Auto-played in {currentVoiceObj?.name || 'Selected'} voice
                </div>
              </div>
            </div>

            <a
              href={resultAudioUrl}
              download="voice_transformed.mp3"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              <span>Save MP3</span>
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
