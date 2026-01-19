'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { WhitelistForm } from './WhitelistForm';
import { SuccessState } from './SuccessState';
import { ErrorState } from './ErrorState';

export type FormState = 'form' | 'success' | 'error';

const STORAGE_KEY = 'zenko_whitelist';

interface GlassSidebarProps {
  mobile?: boolean;
  onStateChange?: (state: FormState) => void;
}

export function GlassSidebar({ mobile = false, onStateChange }: GlassSidebarProps) {
  const [formState, setFormState] = useState<FormState>('form');
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(formState);
  }, [formState, onStateChange]);

  // Check localStorage on mount for existing submission
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.email) {
          setSubmittedEmail(data.email);
          setFormState('success');
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSuccess = (email: string) => {
    // Store in localStorage
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email, submittedAt: new Date().toISOString() })
      );
    } catch {
      // Ignore localStorage errors
    }
    setSubmittedEmail(email);
    setFormState('success');
  };

  const handleError = () => {
    setFormState('error');
  };

  const handleRetry = () => {
    // Clear localStorage when retrying with a different email
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
    setFormState('form');
  };

  if (mobile) {
    // Success/Error states on mobile show transparent background (background image shows through)
    if (formState === 'success' || formState === 'error') {
      return (
        <div className="flex w-full flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-[320px]">
            {formState === 'success' && (
              <SuccessState email={submittedEmail} onSubmitAgain={handleRetry} />
            )}
            {formState === 'error' && <ErrorState onRetry={handleRetry} />}
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[calc(100vh-400px)] w-full flex-col rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-start px-4 pt-4">
          {/* Heading */}
          <h2 className="text-left text-2xl font-semibold leading-tight tracking-[-0.72px]">
            <span className="text-3xl font-semibold font-['Inter'] leading-8 text-[#cbbaee]">Get Early Access to</span>{' '}
            <span className="text-3xl font-semibold font-['Inter'] leading-8 text-[#fdb022]">Zenko</span>
          </h2>
        </div>

        {/* Content - Form */}
        <div className="flex-1 px-4 py-4">
          <WhitelistForm onSuccess={handleSuccess} onError={handleError} />
        </div>

        {/* Footer */}
        <div className="mt-auto space-y-4 px-6 py-6">
          {/* Built on Sui */}
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-sm uppercase tracking-wide">Built on</span>
            <Image
              src="/images/icons/sui.svg"
              alt="Sui"
              width={46}
              height={16}
              className="h-4 w-auto"
            />
          </div>

          {/* Copyright and Social */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">© 2026 Zenko, All rights reserved.</span>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/zenkogg?igsh=YzdqYTc0N2ZuMzNx&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://x.com/zenkogginc?s=21&t=aZd4S6kCPZBx-rpP3YEdAg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
                aria-label="X (Twitter)"
              >
                <XIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success/Error states get a simplified layout without header/footer
  if (formState === 'success' || formState === 'error') {
    return (
      <div className="flex h-full w-full flex-col rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-[384px]">
            {formState === 'success' && (
              <SuccessState email={submittedEmail} onSubmitAgain={handleRetry} />
            )}
            {formState === 'error' && <ErrorState onRetry={handleRetry} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl">
      {/* Main Content - Vertically Centered, scrollable on small screens */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex min-h-full w-full max-w-[384px] flex-col justify-center">
          {/* Logo - Centered */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center">
              <Image
                src="/images/zenko-head.svg"
                alt="Zenko Logo"
                width={64}
                height={64}
                className="h-16 w-16"
              />
            </div>
          </div>

          {/* Heading */}
          <h2 className="mb-8 text-center text-4xl font-semibold leading-[44px] tracking-[-0.72px]">
            <span className="text-[#cbbaee]">Get Early Access to</span>{' '}
            <span className="text-[#fdb022]">Zenko</span>
          </h2>

          {/* Content - Form */}
          <div className="w-full">
            <WhitelistForm onSuccess={handleSuccess} onError={handleError} />
          </div>

          {/* Footer */}
          <div className="flex w-full items-center justify-between py-12">
            {/* Copyright */}
            <span className="text-xs font-medium text-[#99a1af]">
              © 2026 Zenko, All rights reserved.
            </span>

            {/* Social Icons */}
            <div className="flex gap-6">
              <a
                href="https://www.instagram.com/zenkogg?igsh=YzdqYTc0N2ZuMzNx&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://x.com/zenkogginc?s=21&t=aZd4S6kCPZBx-rpP3YEdAg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
                aria-label="X (Twitter)"
              >
                <XIcon />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

