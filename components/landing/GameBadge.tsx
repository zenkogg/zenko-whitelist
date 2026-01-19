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
        rounded-xl border px-3 py-2 text-sm font-medium leading-4 transition-all cursor-pointer shadow-[0px_1px_0.5px_0.05px_rgba(29,41,61,0.02)]
        hover:border-[#301c5c] hover:bg-[#1e1238] hover:text-[#9978e0]
        ${
          selected
            ? 'border-[#7e56d8] bg-[#301c5c] text-[#cbbaee]'
            : 'border-[#1e2939] bg-[#101828] text-white'
        }
      `}
    >
      {game}
    </button>
  );
}
