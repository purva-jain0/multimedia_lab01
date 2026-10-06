import React, { useState } from 'react';
import { User, Volume2, Play, Pause, Sparkles, Sliders, Check } from 'lucide-react';

export default function VoiceSelector({
  voices,
  selectedVoiceId,
  onSelectVoice,
  stability,
  setStability,
  similarityBoost,
  setSimilarityBoost
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'male', 'female', 'cloned'
  const [searchQuery, setSearchQuery] = useState('');
  const [playingPreview, setPlayingPreview] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Play preview sample
  const togglePlayPreview = (voice) => {
    if (!voice.preview_url) return;

    if (playingPreview === voice.voice_id && audioElement) {
      audioElement.pause();
      setPlayingPreview(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(voice.preview_url);
    audio.play();
    setPlayingPreview(voice.voice_id);
    setAudioElement(audio);

    audio.onended = () => {
      setPlayingPreview(null);
    };
  };

  // Filter voices
  const filteredVoices = voices.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.style && v.style.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'male') return v.gender?.toLowerCase() === 'male';
    if (filter === 'female') return v.gender?.toLowerCase() === 'female';
    if (filter === 'cloned') return v.is_cloned;
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header and Voice Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            <span>Select Target Voice</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Choose the target voice profile to transform your speech into
          </p>
        </div>

        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '6px 14px',
            borderRadius: '8px',
            background: showSettings ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: showSettings ? '#a5b4fc' : 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Sliders size={15} />
          <span>{showSettings ? 'Hide Settings' : 'Fine-Tune Voice'}</span>
        </button>
      </div>

      {/* Fine-Tuning Voice Settings (Sliders) */}
      {showSettings && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 600 }}>Voice Stability:</span>
              <span style={{ color: 'var(--primary)' }}>{Math.round(stability * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={stability}
              onChange={(e) => setStability(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Higher values ensure consistency; lower values allow more expressive variation.
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 600 }}>Clarity & Similarity Boost:</span>
              <span style={{ color: 'var(--accent-cyan)' }}>{Math.round(similarityBoost * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={similarityBoost}
              onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: '0.2rem' }}>
              Enhances similarity to original voice profile while maintaining clarity.
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { id: 'all', label: 'All Voices' },
            { id: 'male', label: 'Male' },
            { id: 'female', label: 'Female' },
            { id: 'cloned', label: 'Cloned' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: filter === tab.id ? '1px solid var(--primary)' : '1px solid transparent',
                background: filter === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: filter === tab.id ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search voice by name or style..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(15, 23, 42, 0.5)',
            color: '#ffffff',
            fontSize: '0.82rem',
            width: '220px',
            outline: 'none'
          }}
        />
      </div>

      {/* Voices Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.75rem',
        maxHeight: '340px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoiceId === voice.voice_id;
          return (
            <div
              key={voice.voice_id}
              onClick={() => onSelectVoice(voice)}
              style={{
                padding: '0.85rem',
                borderRadius: '12px',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.3)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={12} color="#ffffff" />
                </div>
              )}

              {/* Title & Preview Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? '#a5b4fc' : '#ffffff' }}>
                  {voice.name}
                </div>
                {voice.preview_url && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPreview(voice);
                    }}
                    style={{
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#ffffff'
                    }}
                  >
                    {playingPreview === voice.voice_id ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                )}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {voice.is_cloned && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(236, 72, 153, 0.25)',
                    color: '#f472b6',
                    border: '1px solid rgba(236, 72, 153, 0.4)'
                  }}>
                    CLONED
                  </span>
                )}
                {voice.gender && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-muted)'
                  }}>
                    {voice.gender}
                  </span>
                )}
                {voice.accent && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-muted)'
                  }}>
                    {voice.accent}
                  </span>
                )}
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-faint)',
                lineHeight: 1.3,
                marginTop: '0.2rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {voice.description || voice.style || 'Custom voice character'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
