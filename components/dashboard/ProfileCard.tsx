'use client';

import Image from 'next/image';
import { useState } from 'react';
import { XMarkIcon, PencilIcon, PowerIcon } from '@heroicons/react/20/solid';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import PixelCard from '@/components/PixelCard';

interface ProfileCardProps {
  displayName: string;
  email: string | null;
  customAvatarUrl: string | null;
  createdAt: string;
  userId: string;
  oauthProvider: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  onLogout: () => void;
}

export function ProfileCard({
  displayName,
  email,
  customAvatarUrl,
  createdAt,
  userId,
  oauthProvider,
  onAvatarUpdate,
  onLogout,
}: ProfileCardProps) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

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

  const handleRemoveAvatar = async () => {
    if (!userId) return;

    setIsRemovingAvatar(true);
    setAvatarUploadError('');

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove avatar');
      }

      // Update to null (will fall back to OAuth avatar or default)
      onAvatarUpdate('');
    } catch (error: unknown) {
      console.error('Avatar removal error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove avatar';
      setAvatarUploadError(errorMessage);
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Actual visible content with absolute positioning */}
        <div className="flex flex-col">
          {/* Zenko Logo */}
          <div className="mb-4 flex justify-center">
            <Image
              src="/logo-primary.svg"
              alt="Zenko Logo"
              width={129}
              height={28}
              className="flex h-6 w-auto"
            />
          </div>

          {/* Avatar */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="relative w-full aspect-square mb-3">
              <PixelCard
                variant='default'
                colors="#431B8A,#24163C,#110722"
                gap={3}
                speed={20}
                className='!w-full !h-full !aspect-square rounded-xl overflow-hidden !border-0'
              >
                {/* Image Layer - absolutely positioned inside PixelCard */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ mixBlendMode: 'normal' }}>
                  {!customAvatarUrl ? (
                    <Image
                      key="default"
                      src="/images/placeholder.svg"
                      alt={displayName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <Image
                      key={customAvatarUrl}
                      src={customAvatarUrl}
                      alt={displayName}
                      fill
                      className="object-cover"
                      unoptimized={false}
                    />
                  )}
                </div>

                {/* Loading Spinner Overlay */}
                {(isUploadingAvatar || isRemovingAvatar) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-300/30 border-t-purple-300" />
                      <span className="text-sm text-purple-300 font-medium">
                        {isUploadingAvatar ? 'Uploading...' : 'Removing...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Avatar Controls - positioned at bottom of image, inside PixelCard */}
                <div className="absolute bottom-3 right-3 flex gap-2 z-30">
                {/* Remove Button - only show if custom avatar exists */}
                {customAvatarUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={isRemovingAvatar || isUploadingAvatar}
                        className="cursor-pointer rounded-md bg-black/70 p-2 text-red-300/80 transition-all hover:bg-black/85 hover:text-red-300 backdrop-blur-md border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Remove avatar"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove image</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Upload Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label
                      className="cursor-pointer rounded-md bg-black/70 p-2 text-purple-300/80 transition-all hover:bg-black/85 hover:text-purple-300 backdrop-blur-md border border-white/10"
                      aria-label="Upload avatar"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar || isRemovingAvatar}
                        className="hidden"
                        aria-describedby={avatarUploadError ? 'avatar-error' : undefined}
                      />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change image</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              </PixelCard>
            </div>

            {/* User Info Banner with Logout */}
            <div className="w-full group rounded-lg bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                {/* Left: User Info with Rotating Text */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  {/* Name with Platform Icon */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {oauthProvider === 'twitch' ? (
                      <svg className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    <p className="text-sm font-semibold text-amber-500 truncate" style={{ fontFamily: 'var(--font-sora)' }}>
                      {displayName}
                    </p>
                  </div>

                  {/* Rotating Text Container */}
                  <div className="relative h-4 overflow-hidden">
                    {/* Default State: Joined Date */}
                    <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:-translate-y-full">
                      <p className="text-xs text-neutral-700">Joined {formattedDate}</p>
                    </div>

                    {/* Hover State: Email (for Google only) */}
                    {oauthProvider === 'google' && email && (
                      <div className="absolute inset-0 transition-transform duration-300 ease-out translate-y-full group-hover:translate-y-0">
                        <p className="text-xs text-neutral-700 truncate">{email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Logout Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onLogout}
                      className="flex-shrink-0 text-purple-500 transition-colors hover:text-purple-400 cursor-pointer"
                      aria-label="Log out"
                    >
                      <PowerIcon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Log out</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Error Message */}
            {avatarUploadError && (
              <div className="w-full rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p id="avatar-error" className="text-xs text-red-400 text-center" role="alert">
                  {avatarUploadError}
                </p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
