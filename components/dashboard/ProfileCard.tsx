'use client';

import Image from 'next/image';
import { useState } from 'react';
import ElectricBorder from '@/components/ElectricBorder';

interface ProfileCardProps {
  displayName: string;
  customAvatarUrl: string | null;
  createdAt: string;
  userId: string;
  onAvatarUpdate: (avatarUrl: string) => void;
  borderColor?: string;
}

export function ProfileCard({
  displayName,
  customAvatarUrl,
  createdAt,
  userId,
  onAvatarUpdate,
  borderColor = '#FDB022',
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
    <div
      className="h-full rounded-[18px] transition-shadow duration-500"
      style={{
        boxShadow: `0 0 30px ${borderColor}30, 0 0 60px ${borderColor}18, inset 0 0 30px ${borderColor}08`,
      }}
    >
    <ElectricBorder color={borderColor} speed={1} chaos={0.1} thickness={1.5} borderRadius={18} className="h-full">
      <div className="h-full rounded-2xl bg-gradient-to-br from-white/5 to-white/10 p-6 backdrop-blur-xl">
        {/* Zenko Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo-primary.svg"
            alt="Zenko Logo"
            width={129}
            height={28}
            className="h-7 w-auto"
          />
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
              className="absolute bottom-2 right-2 cursor-pointer rounded-full p-2 transition-all hover:brightness-110"
              style={{ backgroundColor: borderColor }}
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
    </ElectricBorder>
    </div>
  );
}
