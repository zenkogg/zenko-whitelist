'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/20/solid';
import TiltedCard from '@/components/TiltedCard';

interface ProfileCardProps {
  displayName: string;
  customAvatarUrl: string | null;
  createdAt: string;
  userId: string;
  oauthProvider: string;
  onAvatarUpdate: (avatarUrl: string) => void;
}

export function ProfileCard({
  displayName,
  customAvatarUrl,
  createdAt,
  userId,
  oauthProvider,
  onAvatarUpdate,
}: ProfileCardProps) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setIsUploadingAvatar(true);
    setAvatarUploadError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', userId);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload avatar');
      }

      const { data } = await response.json();
      onAvatarUpdate(data.avatarUrl);
    } catch (error: unknown) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      setAvatarUploadError(errorMessage);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]" />
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl p-6">
        {/* Zenko Logo */}
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo-primary.svg"
            alt="Zenko Logo"
            width={129}
            height={28}
            className="h-6 w-auto"
          />
        </div>

        {/* Avatar with Tilt Effect - Square */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative w-full mb-3">
            {/* Blurred background glow */}
            <div className="absolute inset-0 -z-10 rounded-2xl bg-purple-700/50 blur-3xl scale-95" />

            <TiltedCard
              imageSrc={customAvatarUrl || '/images/default-avatar.svg'}
              containerHeight="320px"
              containerWidth="100%"
              imageHeight="300px"
              imageWidth="300px"
              scaleOnHover={1.05}
              rotateAmplitude={18}
              showMobileWarning={false}
              showTooltip={false}
              overlayContent={null}
              displayOverlayContent={false}
            />
          </div>

          {/* User Info Banner - Same style as connected account banner */}
          <div className="w-full max-w-75 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            {/* Left: User Info */}
            <div className="flex items-center gap-2">
              {/* Platform Icon */}
              {oauthProvider === 'twitch' ? (
                <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <div>
                <p className="text-sm font-semibold text-amber-500" style={{ fontFamily: 'var(--font-sora)' }}>
                  {displayName}
                </p>
                <p className="text-xs text-neutral-700">Joined {formattedDate}</p>
              </div>
            </div>

            {/* Right: Upload Button */}
            <label
              className="cursor-pointer text-xs text-purple-300 transition-colors hover:text-purple-50 opacity-50"
              aria-label="Upload avatar"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                className="hidden"
                aria-describedby={avatarUploadError ? 'avatar-error' : undefined}
              />
            </label>
          </div>

          {isUploadingAvatar && (
            <p className="mt-2 text-xs text-blue-400" role="status">
              Uploading...
            </p>
          )}
          {avatarUploadError && (
            <p id="avatar-error" className="mt-2 text-xs text-red-400" role="alert">
              {avatarUploadError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
