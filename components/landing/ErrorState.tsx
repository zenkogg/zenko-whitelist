'use client';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center">
      {/* Error Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
        <svg
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="text-2xl font-bold text-white">
        Submission Failed
      </h3>

      {/* Message */}
      <p className="text-gray-300 max-w-sm">
        Too many requests are hitting us right now; wait a second and try again.
      </p>

      {/* Retry Button */}
      <Button
        onClick={onRetry}
        className="bg-linear-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-semibold"
      >
        Try Again
      </Button>
    </div>
  );
}
