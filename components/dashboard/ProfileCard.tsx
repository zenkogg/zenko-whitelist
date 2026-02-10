'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ProfileCardProps {
  displayName: string;
  customAvatarUrl: string | null;
  createdAt: string;
  userId: string;
  onAvatarUpdate: (avatarUrl: string) => void;
}

export function ProfileCard({
  displayName,
  customAvatarUrl,
  createdAt,
  userId,
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
    <div className="rounded-2xl border border-[#7F56D9]/30 bg-gradient-to-br from-[#7F56D9]/20 to-white/10 p-6 backdrop-blur-xl">
      {/* Zenko Logo */}
      <div className="mb-6 flex items-center gap-2">
        <Image
          src="/images/zenko-head.svg"
          alt="Zenko Logo"
          width={24}
          height={24}
          className="h-6 w-6"
        />
        <span className="text-lg font-semibold text-white">ZENKO</span>
      </div>

      {/* Avatar */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative mb-4">
          <Image
            src={customAvatarUrl || '/images/default-avatar.svg'}
            alt={displayName}
            width={200}
            height={200}
            className="h-48 w-48 rounded-xl object-cover"
          />
          <label
            className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-[#7F56D9] p-2 transition-all hover:bg-[#9b8afb]"
            aria-label="Upload avatar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
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

        {/* Username */}
        <div className="text-center">
          <div className="text-lg font-semibold text-white">{displayName}</div>
          <div className="text-sm text-gray-300">Joined {formattedDate}</div>
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
  );
}
