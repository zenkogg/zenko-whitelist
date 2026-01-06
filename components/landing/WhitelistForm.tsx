'use client';

import { useState } from 'react';
import { GameBadge } from './GameBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

    // DISABLED: Form submissions not yet enabled
    setEmailError('Form submissions are currently disabled');
    return;

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Game of Interest Section */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white">
          Game of Interest
        </label>
        <div className="flex flex-wrap gap-2">
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

      {/* Email Input */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-white">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />
        {emailError && (
          <p className="text-sm text-red-400">{emailError}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-zenko-purple! text-white font-semibold py-3 cursor-pointer hover:bg-zenko-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Joining...' : 'Join Waitlist'}
      </Button>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 text-center">
        By joining, you agree to receive future updates and marketing communications.
      </p>
    </form>
  );
}
