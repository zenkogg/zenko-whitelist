'use client';

import { useState } from 'react';

export const BORDER_COLOR_PRESETS = [
  { id: 'orange', name: 'Zenko Orange', color: '#FDB022' },
  { id: 'purple', name: 'Zenko Purple', color: '#7F56D9' },
  { id: 'cyan', name: 'Electric Cyan', color: '#22D3EE' },
  { id: 'emerald', name: 'Neon Emerald', color: '#34D399' },
  { id: 'rose', name: 'Hot Rose', color: '#FB7185' },
] as const;

export type CardStyleId = 'electric' | 'tilt';

const CARD_STYLES = [
  { id: 'electric' as const, icon: '\u26A1', name: 'Electric' },
  { id: 'tilt' as const, icon: '\uD83C\uDFB4', name: 'Tilt' },
];

interface CardStyleSwitcherProps {
  cardStyle: CardStyleId;
  onCardStyleChange: (style: CardStyleId) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
}

export function CardStyleSwitcher({
  cardStyle,
  onCardStyleChange,
  currentColor,
  onColorChange,
}: CardStyleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeStyle = CARD_STYLES.find(s => s.id === cardStyle) ?? CARD_STYLES[0];

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {isOpen && (
        <div className="mb-3 rounded-xl border border-white/20 bg-black/80 p-3 shadow-2xl backdrop-blur-xl">
          {/* Card Style Section */}
          <div className="mb-4">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/60">
              Card Style
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CARD_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => onCardStyleChange(style.id)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    cardStyle === style.id
                      ? 'bg-white/15 text-white ring-2 ring-white/30'
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{style.icon}</span>
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets Section - Only show for electric style */}
          {cardStyle === 'electric' && (
            <div>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/60">
                Border Color
              </div>
              <div className="space-y-1">
                {BORDER_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onColorChange(preset.color);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                      currentColor === preset.color
                        ? 'bg-white/15 text-white'
                        : 'bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/20"
                      style={{
                        backgroundColor: preset.color,
                        boxShadow: `0 0 8px ${preset.color}80`,
                      }}
                    />
                    <span className="text-sm font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl transition-all hover:bg-black/90"
        title="Switch card style"
      >
        {cardStyle === 'electric' ? (
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{
              backgroundColor: currentColor,
              boxShadow: `0 0 6px ${currentColor}80`,
            }}
          />
        ) : (
          <span className="text-base">{activeStyle.icon}</span>
        )}
        <span className="hidden sm:inline">{activeStyle.name}</span>
      </button>
    </div>
  );
}
