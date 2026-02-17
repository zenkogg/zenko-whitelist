'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface WaitlistUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AvatarGroupProps {
  totalWaitlistUsers: number;
}

export function AvatarGroup({ totalWaitlistUsers }: AvatarGroupProps) {
  const [recentUsers, setRecentUsers] = useState<WaitlistUser[]>([]);

  useEffect(() => {
    fetchRecentUsers();
  }, []);

  const fetchRecentUsers = async () => {
    try {
      const response = await fetch('/api/waitlist/recent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 4 }),
      });

      if (!response.ok) return;

      const result = await response.json();
      if (result.success && result.data) {
        setRecentUsers(result.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch recent users:', error);
    }
  };

  const maxAvatars = 4;
  const displayUsers = recentUsers.slice(0, maxAvatars);

  return (
    <div className="flex items-center justify-center gap-3 py-8 md:py-6">
      {displayUsers.length > 0 && (
        <>
          <div className="flex -space-x-2">
            {displayUsers.map((user, index) => (
              <div
                key={user.id}
                className={`relative h-10 w-10 rounded-full ring-2 ring-purple-300/50 bg-purple-400 overflow-hidden`}
                style={{ zIndex: maxAvatars - index }}
              >
                <Image
                  src={user.avatarUrl || '/images/placeholder.svg'}
                  alt={user.displayName}
                  fill
                  className="rounded-full object-cover"
                  unoptimized
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/placeholder.svg';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Bullet separator */}
          <div className="h-1.5 w-1.5 rounded-full bg-purple-300/60" />
        </>
      )}

      <span className="text-sm text-neutral-700">
        <span className="font-semibold text-purple-300">{totalWaitlistUsers.toLocaleString()}</span> joined the waitlist
      </span>
    </div>
  );
}
