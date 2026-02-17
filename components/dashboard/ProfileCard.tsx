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
  registrationOrder?: number;
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
  registrationOrder,
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
    <div className="h-full w-full rounded-2xl bg-white/5 p-4 md:p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col">
        <div className="flex flex-col flex-1">
          {/* Zenko Logo */}
          <div className="mb-4 flex justify-center">
            <Image
              src="/logo-primary.svg"
              alt="Zenko Logo"
              width={129}
              height={28}
              className="flex h-7 w-auto drop-shadow-[0_0_8px_rgba(127,86,217,0.25)]"
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

              {/* Error Message */}
              {avatarUploadError && (
                <p id="avatar-error" className="mt-2 text-xs text-error-300 text-center" role="alert">
                  {avatarUploadError}
                </p>
              )}
            </div>

            {/* User Info Banner */}
            <div className={`w-full rounded-xl bg-white/5 px-4 py-3 ${oauthProvider === 'google' && email ? 'group' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                {/* Left: User Info with Rotating Text */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  {/* Name with Platform Icon */}
                  <div className="flex items-center gap-1.5">
                    {oauthProvider === 'twitch' ? (
                      <Image
                        src="/images/icons/twitch.svg"
                        alt="Twitch"
                        width={16}
                        height={16}
                        className="h-4 w-4 flex-shrink-0"
                      />
                    ) : (
                      <Image
                        src="/images/icons/google.svg"
                        alt="Google"
                        width={16}
                        height={16}
                        className="h-4 w-4 flex-shrink-0"
                      />
                    )}
                    <p className="text-base font-semibold text-amber-500 truncate" style={{ fontFamily: 'var(--font-sora)' }}>
                      {displayName}
                    </p>
                  </div>

                  {/* Rotating Text Container - Only for Google with email */}
                  {oauthProvider === 'google' && email ? (
                    <>
                      {/* Desktop: hover to reveal email */}
                      <div className="relative h-5 overflow-hidden hidden md:block">
                        <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:-translate-y-full">
                          <p className="text-sm text-neutral-700">Joined {formattedDate}</p>
                        </div>
                        <div className="absolute inset-0 transition-transform duration-300 ease-out translate-y-full group-hover:translate-y-0">
                          <p className="text-sm text-neutral-700 truncate">{email}</p>
                        </div>
                      </div>
                      {/* Mobile: show both */}
                      <div className="md:hidden">
                        <p className="text-sm text-neutral-700">Joined {formattedDate}</p>
                        <p className="text-xs text-neutral-700/70 truncate">{email}</p>
                      </div>
                    </>
                  ) : (
                    /* Static Joined Date for Twitch */
                    <p className="text-sm text-neutral-700">Joined {formattedDate}</p>
                  )}
                </div>

                {/* Right: Registration Order */}
                {registrationOrder && (
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <span
                      className={`text-amber-500 ${
                        registrationOrder > 999 ? 'text-xl' : 'text-2xl'
                      }`}
                      style={{ fontFamily: 'var(--font-press-start)' }}
                    >
                      #{registrationOrder.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
    </div>
  );
}
