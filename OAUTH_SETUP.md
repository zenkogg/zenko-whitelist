# OAuth Login Implementation

This document describes the OAuth login system for the Zenko waitlist application.

## Overview

The waitlist app supports three OAuth providers:
- **Google** - Primary provider for email-based authentication
- **Twitch** - Gaming-focused authentication
- **Twitter/X** - Optional, for social sharing features

## Architecture

### Authentication Flow

1. **Login** (`/auth/login`) - User selects OAuth provider
2. **OAuth Callback** - NextAuth handles provider authentication
3. **Game Selection** (`/games`) - New users select their game interests
4. **Dashboard** (`/dashboard`) - View referral stats and share links

### Pages

#### `/auth/login`
- OAuth sign-in buttons for Google and Twitch
- Auto-redirects authenticated users to appropriate page
- Dark theme with purple accents matching Zenko branding

#### `/games`
- Protected route requiring authentication
- Game selection form with badge UI
- Saves game preferences to database
- Shows user profile in header with logout option

#### `/dashboard`
- Protected route requiring authentication AND completed game selection
- Displays user stats:
  - Referral count and progress (x/50)
  - Reputation points
  - Waitlist status
- Referral code with copy-to-clipboard
- Twitter/X connection for social sharing
- Share on X button (uses Twitter Web Intent)

## Components

### Auth Components (`/components/auth/`)

#### `OAuthButton`
Reusable OAuth provider button with provider-specific styling.

```tsx
import { OAuthButton } from '@/components/auth';

<OAuthButton
  provider="google"
  onClick={() => signIn('google')}
  isLoading={isLoading}
/>
```

#### `UserHeader`
Header component showing authenticated user info with logout.

```tsx
import { UserHeader } from '@/components/auth';

<UserHeader session={session} />
```

## API Routes

### `POST /api/user/games`
Save user's selected games.

**Request:**
```json
{
  "games": ["lol", "tft", "valorant"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "games": ["lol", "tft", "valorant"],
    "displayName": "User Name",
    "referralCode": "ABC123"
  }
}
```

### `GET /api/user/stats`
Get user's waitlist statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "displayName": "User Name",
      "referralCode": "ABC123",
      "twitterHandle": "@username",
      "status": "PENDING"
    },
    "stats": {
      "referralCount": 5,
      "reputationPoints": 50,
      "estimatedRank": 123,
      "totalPending": 1000,
      "rankPercentile": 88
    },
    "referrals": []
  }
}
```

## Database Schema

### WaitlistUser Model

```prisma
model WaitlistUser {
  // OAuth Identity
  oauthProvider     String   // "google" | "twitch" | "twitter"
  oauthId           String   // Provider's user ID
  email             String?
  emailVerified     Boolean

  // Profile
  displayName       String?
  oauthAvatarUrl    String?

  // Twitter/X (optional)
  twitterId         String?
  twitterHandle     String?

  // Game Interests
  games             String[]  // ["lol", "tft", "valorant"]

  // Referral System
  referralCode      String    @unique
  referredById      String?
  referralCount     Int       @default(0)
  reputationPoints  Int       @default(0)

  // Status
  status            WaitlistStatus @default(PENDING)
}
```

## Environment Variables

Required environment variables in `.env.local`:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twitch OAuth
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret

# Twitter OAuth (optional)
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Database
DATABASE_URL=your-postgres-url
DATABASE_URL_UNPOOLED=your-postgres-direct-url
```

## Styling

The OAuth UI follows Zenko's design system:

- **Dark theme** - Black background with purple gradients
- **Primary color** - `#7F56D9` (Purple)
- **Accent color** - `#FDB022` (Gold/Orange)
- **Glass morphism** - Backdrop blur with border
- **Typography** - Inter font family

### Color Palette

```css
--color-zenko-purple: #7F56D9;
--color-zenko-accent: #FDB022;
--color-badge-selected: #301C5C;
--color-badge-unselected: #1E2939;
```

## User Flow

### New User
1. Visit `/auth/login`
2. Click "Sign in with Google" or "Sign in with Twitch"
3. Authorize OAuth provider
4. Redirected to `/games` to select interests
5. Submit games → Redirected to `/dashboard`
6. View referral code and stats

### Returning User
1. Visit `/auth/login`
2. Sign in with OAuth provider
3. Auto-redirected to `/dashboard` (games already selected)
4. View updated referral stats

## Testing

### Manual Testing Checklist

- [ ] Login with Google works
- [ ] Login with Twitch works
- [ ] Logout redirects to login page
- [ ] Game selection saves correctly
- [ ] Dashboard shows correct stats
- [ ] Referral code copy works
- [ ] Twitter connection works
- [ ] Share on X opens Twitter intent
- [ ] Protected routes redirect unauthenticated users
- [ ] Mobile responsive design works

### Test Users

Create test OAuth apps for each provider in development mode.

## Security Considerations

1. **Session Management** - JWT-based sessions via NextAuth
2. **CSRF Protection** - Built into NextAuth
3. **Environment Variables** - Never commit secrets to git
4. **OAuth Scopes** - Request minimal required permissions
5. **Database** - Prisma with parameterized queries

## Future Enhancements

- [ ] Discord OAuth provider
- [ ] Apple Sign In
- [ ] Email magic link fallback
- [ ] Two-factor authentication
- [ ] Account linking (multiple OAuth providers)
- [ ] Profile customization
- [ ] Avatar upload

## Troubleshooting

### "Unauthorized" Error
- Check that OAuth credentials are correct in `.env.local`
- Verify callback URLs match in provider console
- Ensure database is accessible

### "User not found" Error
- Check that signIn callback in `lib/auth.ts` creates user
- Verify Prisma schema is migrated
- Check database connection

### Redirect Loop
- Clear cookies and localStorage
- Check session strategy in NextAuth config
- Verify protected route logic

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Twitch OAuth Setup](https://dev.twitch.tv/docs/authentication)
- [Twitter OAuth Setup](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
