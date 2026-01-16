'use client';

import Image from 'next/image';

interface SuccessStateProps {
  email: string;
  onSubmitAgain: () => void;
}

export function SuccessState({ email, onSubmitAgain }: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center">
      {/* Success Icon */}
      <Image
        src="/images/icons/check-circle.svg"
        alt="Success"
        width={64}
        height={64}
        className="h-16 w-16"
      />

      {/* Heading */}
      <h3 className="text-2xl font-bold text-[#fdb022]">All signed up!</h3>

      {/* Message */}
      <p className="max-w-sm text-gray-300">
        {"You're officially on the Zenko waitlist. Watch"}{' '}
        <span className="font-semibold text-white">{email}</span> for a
        confirmation and future updates.
      </p>
    </div>
  );
}
