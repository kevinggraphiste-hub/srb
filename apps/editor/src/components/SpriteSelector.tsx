import { useEffect, useRef, useState } from 'react';
import { CHARACTER_SPRITES, getCharacterSpritePreset } from '@srb/engine';
import type { EventEditorMode } from './EventEditor';

interface SpriteSelectorProps {
  value: string | null;
  mode: EventEditorMode;
  onChange: (next: string | null) => void;
}

function colorHex(tint: number): string {
  return `#${tint.toString(16).padStart(6, '0')}`;
}

export function SpriteSelector({ value, mode, onChange }: SpriteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState(value ?? '');
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCustomValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent): void => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      const popup = document.querySelector('.sprite-popup');
      if (popup && popup.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const preset = value ? getCharacterSpritePreset(value) : null;
  const isInvisible = value === null;
  const isCustom = value !== null && preset === null;
  const triggerLabel = isInvisible
    ? '(invisible)'
    : preset
      ? preset.label
      : `${value} (personnalisé)`;
  const triggerTint = preset ? colorHex(preset.tint) : '#444';

  const pick = (id: string | null): void => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="sprite-selector">
      <button
        ref={buttonRef}
        type="button"
        className="sprite-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <SpriteAvatar tint={triggerTint} empty={isInvisible || isCustom} />
        <span className="sprite-trigger-label">{triggerLabel}</span>
        <span className="sprite-trigger-caret">▾</span>
      </button>
      {open && (
        <div className="sprite-popup" role="listbox">
          <button
            type="button"
            className={`sprite-option ${isInvisible ? 'active' : ''}`}
            onClick={() => pick(null)}
          >
            <SpriteAvatar tint="#444" empty />
            <span className="sprite-option-label">
              <strong>(invisible)</strong>
              <small>Panneau, téléporteur, déclencheur…</small>
            </span>
          </button>
          <div className="sprite-popup-divider" />
          <div className="sprite-grid">
            {CHARACTER_SPRITES.map((s) => {
              const isActive = value === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`sprite-option ${isActive ? 'active' : ''}`}
                  onClick={() => pick(s.id)}
                  title={s.hint}
                >
                  <SpriteAvatar tint={colorHex(s.tint)} />
                  <span className="sprite-option-label">
                    <strong>{s.label}</strong>
                    <small>{s.hint}</small>
                  </span>
                </button>
              );
            })}
          </div>
          {mode === 'advanced' && (
            <>
              <div className="sprite-popup-divider" />
              <div className="sprite-custom">
                <label>
                  Id personnalisé
                  <input
                    value={customValue}
                    placeholder="my-custom-sprite"
                    onChange={(e) => setCustomValue(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => pick(customValue.trim() ? customValue.trim() : null)}
                >
                  Utiliser
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SpriteAvatarProps {
  tint: string;
  empty?: boolean;
}

function SpriteAvatar({ tint, empty }: SpriteAvatarProps) {
  return (
    <span
      className={`sprite-avatar ${empty ? 'empty' : ''}`}
      style={empty ? undefined : { background: tint }}
      aria-hidden="true"
    >
      {empty ? '∅' : '☻'}
    </span>
  );
}
