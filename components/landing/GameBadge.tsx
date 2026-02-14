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
        rounded-full border-2 px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer
        ${
          selected
            ? 'border-purple-400/50 bg-purple-400/20 text-purple-300'
            : 'border-purple-300/20 bg-black/10 text-neutral-700 hover:border-purple-400/30 hover:bg-purple-500/15 hover:text-purple-400'
        }
      `}
    >
      {game}
    </button>
  );
}
