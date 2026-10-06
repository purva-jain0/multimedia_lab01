import React from 'react';
import { Cpu, Radio, Sparkles, Volume2 } from 'lucide-react';

const LOCAL_EFFECTS = [
  {
    id: 'deep_narration',
    name: 'Deep Voice Pitch',
    icon: '🎙️',
    description: 'Pitches down ~4 semitones with warm bass boost for a movie trailer narrator vibe.'
  },
  {
    id: 'chipmunk_high',
    name: 'High Pitch / Chipmunk',
    icon: '🐿️',
    description: 'Pitches up ~5 semitones while preserving playback timing.'
  },
  {
    id: 'cyborg_robot',
    name: 'Cyborg / Robot',
    icon: '🤖',
    description: 'Metallic flanger and tremolo modulation for an android robotic voice.'
  },
  {
    id: 'vintage_radio',
    name: 'Walkie-Talkie / Radio',
    icon: '📻',
    description: 'Narrowband telephone/radio filter with 8-bit analog crunch.'
  },
  {
    id: 'whisper_echo',
    name: 'Spectral Echo / Hall',
    icon: '🌌',
    description: 'Spacious reverb and stereo reflection decay.'
  }
];

export default function LocalFxSelector({ selectedEffect, onSelectEffect }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={20} color="var(--accent-cyan)" />
          <span>Select Local Voice Effect</span>
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Instant DSP audio DSP transformation powered by FFmpeg (Zero latency & 100% offline)
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '0.75rem'
      }}>
        {LOCAL_EFFECTS.map((fx) => {
          const isSelected = selectedEffect === fx.id;
          return (
            <div
              key={fx.id}
              onClick={() => onSelectEffect(fx.id)}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.3)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{fx.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#38bdf8' : '#ffffff' }}>
                  {fx.name}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                {fx.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
