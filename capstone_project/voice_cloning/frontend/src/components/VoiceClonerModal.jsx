import React, { useState, useRef } from 'react';
import { X, Mic, Upload, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function VoiceClonerModal({ isOpen, onClose, onVoiceCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [sampleDuration, setSampleDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  if (!isOpen) return null;

  const startSampleRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `${name || 'cloned_sample'}.webm`, { type: 'audio/webm' });
        setAudioFile(file);
      };

      recorder.start();
      setIsRecordingSample(true);
      setSampleDuration(0);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setSampleDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } catch (err) {
      setError("Microphone permission required to record sample.");
    }
  };

  const stopSampleRecording = () => {
    setIsRecordingSample(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleCloneSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for your cloned voice.");
      return;
    }
    if (!audioFile) {
      setError("Please record or upload an audio sample (at least 5-10 seconds of clear speech).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('audio', audioFile);

    try {
      const res = await fetch('/api/clone-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to clone voice with ElevenLabs.");
      }

      setSuccessMsg(data.message);
      setTimeout(() => {
        onVoiceCreated();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          padding: '2rem',
          borderRadius: '16px',
          background: '#0d1322',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Clone A New Voice (IVC)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCloneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Voice Name *
            </label>
            <input
              type="text"
              placeholder="e.g. My Personal Clone, Professor Voice, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Natural voice sample recorded for capstone project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Voice Sample Input (Record or Upload) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Voice Sample (Record 5-15s or Upload Audio) *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Record Button */}
              <button
                type="button"
                onClick={isRecordingSample ? stopSampleRecording : startSampleRecording}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '12px',
                  borderRadius: '10px',
                  border: isRecordingSample ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isRecordingSample ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isRecordingSample ? '#f87171' : '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <Mic size={18} />
                <span>{isRecordingSample ? `Stop (${sampleDuration}s)` : 'Record Sample'}</span>
              </button>

              {/* Upload Button */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <Upload size={18} />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {audioFile && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <CheckCircle2 size={14} />
                <span>Sample ready: {audioFile.name || 'Microphone recording'} ({(audioFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: 'var(--primary)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                boxShadow: '0 4px 12px var(--primary-glow)'
              }}
            >
              {isSubmitting ? 'Cloning Voice...' : 'Create Cloned Voice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
