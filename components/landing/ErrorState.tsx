'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  onRetry: () => void;
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center w-full max-w-[360px] mx-auto">
      {/* Error Icon */}
      <Image
        src="/images/icons/x-circle.svg"
        alt="Error"
        width={64}
        height={64}
        className="h-16 w-16"
      />

      {/* Heading */}
      <h3 className="text-2xl font-bold text-[#FDB022]">Submission Failed</h3>

      {/* Message */}
      <p className="text-base font-normal font-['Inter'] leading-6 text-[#FFFFFF]">
        Submission failed. Too many requests are hitting us right now; wait a second and try again.
      </p>

      {/* Retry Button */}
      <Button
        color="brand"
        onClick={onRetry}
        className="w-full self-stretch mt-2"
      >
        Try Again
      </Button>
    </div>
  );
}
