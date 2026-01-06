'use client';

interface GameBadgeProps {
  game: string;
  selected: boolean;
  onClick: () => void;
}

export function GameBadge({ game, selected, onClick }: GameBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-full border px-4 py-1.5 text-sm font-medium transition-all cursor-pointer
        ${
          selected
            ? 'border-badge-selected bg-badge-selected/40 text-white shadow-xs'
            : 'bg-badge-unselected border-badge-unselected text-gray-300 hover:bg-badge-unselected/80 hover:border-white/20'
        }
      `}
    >
      {game}
    </button>
  );
}
