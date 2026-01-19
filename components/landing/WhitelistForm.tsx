'use client';

import { useState } from 'react';
import { GameBadge } from './GameBadge';
import { Button } from '@/components/ui/button';

interface WhitelistFormProps {
  onSuccess: (email: string) => void;
  onError: () => void;
}

const GAMES = [
  'League of Legends',
  'TFT',
  'Valorant',
  'Dota 2',
  'Fortnite',
  'NBA 2K26',
  'FC 26',
];

export function WhitelistForm({ onSuccess, onError }: WhitelistFormProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGame = (game: string) => {
    setSelectedGames((prev) =>
      prev.includes(game)
        ? prev.filter((g) => g !== game)
        : [...prev, game]
    );
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate at least one game selected
    if (selectedGames.length === 0) {
      setEmailError('Please select at least one game');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          games: selectedGames,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      // Store in localStorage to prevent resubmission
      localStorage.setItem('zenko_whitelist_submitted', 'true');
      localStorage.setItem('zenko_whitelist_email', email);

      onSuccess(email);
    } catch (error) {
      console.error('Submission error:', error);
      onError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Game of Interest Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm font-medium">
          <label className="text-[#f7f7f7]">
            Select at least ONE game of interest below:<span className="text-[#c70036]">*</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          {GAMES.map((game) => (
            <GameBadge
              key={game}
              game={game}
              selected={selectedGames.includes(game)}
              onClick={() => toggleGame(game)}
            />
          ))}
        </div>
      </div>

      {/* Email Input and Actions */}
      <div className="flex flex-col gap-6">
        {/* Email Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-white">
            Email<span className="text-[#c70036]">*</span>
          </label>
          <div className="relative">
            <input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-base text-zinc-950 placeholder:text-[#717680] shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] focus:outline-none focus:ring-2 ${
                emailError
                  ? 'border-[#f04438] focus:ring-[#f04438]/30'
                  : 'border-[#d5d7da] focus:ring-blue-500'
              }`}
            />
            {emailError && (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="10" cy="10" r="9" stroke="#f04438" strokeWidth="1.5" />
                  <path
                    d="M10 6v4M10 14h.01"
                    stroke="#f04438"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
          {emailError && (
            <p className="text-sm text-[#f04438]">{emailError}</p>
          )}
        </div>

        {/* Submit Button and Disclaimer */}
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            color="brand"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Joining...' : 'Join Waitlist'}
          </Button>
          <p className="text-xs font-medium text-white/50">
            By joining, you agree to receive future updates and marketing communications.
          </p>
        </div>
      </div>
    </form>
  );
}
