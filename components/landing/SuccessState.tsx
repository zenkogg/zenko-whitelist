'use client';

interface SuccessStateProps {
  email: string;
  onSubmitAgain: () => void;
}

export function SuccessState({ email, onSubmitAgain }: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center">
      {/* Success Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
        <svg
          className="h-8 w-8 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="text-2xl font-bold text-white">
        You're on the list!
      </h3>

      {/* Message */}
      <p className="text-gray-300 max-w-sm">
        You're officially on the Zenko waitlist. Watch{' '}
        <span className="font-semibold text-white">{email}</span> for a
        confirmation and future updates.
      </p>

      {/* Submit Again Link */}
      <button
        onClick={onSubmitAgain}
        className="text-sm text-indigo-400 hover:text-indigo-300 underline"
      >
        Submit with a different email
      </button>
    </div>
  );
}
