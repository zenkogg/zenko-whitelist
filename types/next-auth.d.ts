import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      waitlistUserId?: string;
      referralCode?: string;
      oauthProvider?: 'google' | 'twitch' | 'twitter';
      hasCompletedGames?: boolean;
    } & DefaultSession['user'];
  }
}
