'use client';

/**
 * The landing's signed-out panel: the waitlist pill, the pitch, the OAuth
 * buttons and the recent sign-ups. Once Zenko is open the buttons still sign in
 * to the waitlist, so the pitch turns to players who already have XP here and
 * the pill goes. Its parent owns the session and the redirect.
 */

import Image from 'next/image';
import type { OAuthProvider } from '@/lib/oauth-client';
import { ZenkoOpenBanner } from '@/components/ZenkoOpenBanner';

const VL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_VL_LOGIN_ENABLED === 'true';

export interface WaitlistStats {
  totalCount: number;
  recentUsers: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  waitlistStatus: 'open' | 'closed';
}

interface WaitlistSignInProps {
  zenkoOpen: boolean;
  /** Null while the stats are loading or after they failed to load. */
  stats: WaitlistStats | null;
  onSignIn: (provider: OAuthProvider) => void;
}

const providerButtonClassName =
  'flex w-full items-center justify-center gap-3 rounded-xl bg-white/5 border border-purple-300/20 px-4 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-white/10 cursor-pointer';

export function WaitlistSignIn({ zenkoOpen, stats, onSignIn }: WaitlistSignInProps) {
  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto">
      <ZenkoOpenBanner open={zenkoOpen} />

      {stats && !zenkoOpen && (
        <div className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1 ${
          stats.waitlistStatus === 'open'
            ? 'border-success-300/30 bg-success-300/10'
            : 'border-error-300/30 bg-error-300/10'
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full ${
            stats.waitlistStatus === 'open'
              ? 'bg-success-300 animate-pulse'
              : 'bg-error-300'
          }`} />
          <span className={`text-xs font-medium ${
            stats.waitlistStatus === 'open'
              ? 'text-success-300'
              : 'text-error-300'
          }`}>
            Waitlist {stats.waitlistStatus === 'open' ? 'open' : 'closed'}
          </span>
        </div>
      )}

      <div className="text-center space-y-3">
        {zenkoOpen ? (
          <>
            <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white text-balance">
              Already on the waitlist? Sign in to see your XP.
            </h2>
            <p className="text-sm md:text-base text-gray-400">
              Your XP comes with you when you sign up at zenko.gg with the same Google or Twitch account.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-white">
              Join Zenko. Be a <span className="text-amber-500">Day One</span>.
            </h2>
            <p className="text-sm md:text-base text-gray-400">
              Before the awards. Before the spotlight. This is where the names that matter started.
            </p>
          </>
        )}
      </div>

      <div className="w-full space-y-3">
        <button onClick={() => onSignIn('google')} className={providerButtonClassName}>
          <Image
            src="/images/icons/google.svg"
            alt="Google"
            width={16}
            height={16}
            className="h-4 w-4 flex-shrink-0"
          />
          <span>Sign in with Google</span>
        </button>

        <button onClick={() => onSignIn('twitch')} className={providerButtonClassName}>
          <Image
            src="/images/icons/twitch.svg"
            alt="Twitch"
            width={16}
            height={16}
            className="h-4 w-4 flex-shrink-0"
          />
          <span>Sign in with Twitch</span>
        </button>

        <button onClick={() => onSignIn('twitter')} className={providerButtonClassName}>
          <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Continue with X</span>
        </button>

        {VL_LOGIN_ENABLED && (
          <button onClick={() => onSignIn('virtualeagues')} className={providerButtonClassName}>
            <Image
              src="/images/icons/virtualeagues.png"
              alt="Virtualeagues"
              width={16}
              height={16}
              className="h-4 w-4 flex-shrink-0"
            />
            <span>Sign in with Virtualeagues</span>
          </button>
        )}
      </div>

      {stats && (
        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {stats.recentUsers.slice(0, 4).map((user, index) => (
              <div
                key={user.id}
                className="relative h-8 w-8 rounded-full ring-2 ring-purple-300/50 bg-purple-400 overflow-hidden"
                style={{ zIndex: 10 - index }}
              >
                <Image
                  src={user.avatarUrl || '/images/placeholder.svg'}
                  alt={user.displayName}
                  fill
                  sizes="32px"
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

          <div className="h-1.5 w-1.5 rounded-full bg-purple-300/60" />

          <span className="text-xs font-medium text-gray-400">
            <span className="text-zenko-light font-semibold">
              {stats.totalCount.toLocaleString()}+
            </span> joined
          </span>
        </div>
      )}

      <div className="w-full border-t border-white/10"></div>

      <p className="text-center text-xs text-gray-400 -mt-2">
        By signing in, you agree to receive updates and marketing communications.
      </p>
    </div>
  );
}
