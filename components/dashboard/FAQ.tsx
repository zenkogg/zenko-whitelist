'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export function FAQ() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-8 lg:col-span-6 rounded-2xl bg-white/5 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6"
      >
        <h3 className="text-lg font-semibold text-white text-left">How to Earn Reputation</h3>
        <ChevronDownIcon
          className={`h-5 w-5 text-purple-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-6 pb-6 pt-2">
          <ul className="space-y-1 text-sm text-neutral-800">
            <li>• Share your referral code with friends (+10 points per referral)</li>
            <li>• Connect your X/Twitter account (+5 points)</li>
            <li>• Share on X/Twitter (+5 points per share)</li>
            <li>• Reach 50 referrals for priority beta access</li>
          </ul>
        </div>
      )}
    </div>
  );
}
