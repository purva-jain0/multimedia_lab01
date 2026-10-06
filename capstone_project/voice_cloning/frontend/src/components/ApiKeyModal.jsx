import React, { useState } from 'react';
import { X, Key, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, currentStatus, onKeyUpdated }) {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Please enter a valid ElevenLabs API key.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Invalid ElevenLabs API key.");
      }

      setSuccess("ElevenLabs API Key configured and verified successfully!");
      setApiKey('');
      setTimeout(() => {
        onKeyUpdated();
        onClose();
      }, 1200);
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
          maxWidth: '480px',
          padding: '2rem',
          borderRadius: '16px',
          background: '#0d1322',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ElevenLabs API Settings</h3>
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

        {/* Current Status Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Connection Status:</span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: currentStatus?.is_valid ? '#34d399' : '#f87171',
              fontWeight: 600
            }}>
              {currentStatus?.is_valid ? '● Active & Valid' : '● Not Connected / Invalid'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Configured Key:</span>
            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
              {currentStatus?.masked_key || 'None'}
            </span>
          </div>

          {currentStatus?.user_info && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Account Tier:</span>
              <span style={{ textTransform: 'capitalize', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                {currentStatus.user_info.subscription_tier}
              </span>
            </div>
          )}
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

        {success && (
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
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Enter / Update API Key
            </label>
            <input
              type="password"
              placeholder="xi-api-key or sk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                outline: 'none'
              }}
              required
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: '0.4rem' }}>
              Your API key will be saved locally in <code>backend/.env</code>.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <a
              href="https://elevenlabs.io/app/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
                color: 'var(--accent-cyan)',
                textDecoration: 'none'
              }}
            >
              <span>Get ElevenLabs Key</span>
              <ExternalLink size={12} />
            </a>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {isSubmitting ? 'Testing Key...' : 'Save & Verify'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
