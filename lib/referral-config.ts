// Referral system configuration
// Env vars override these defaults (server-side only for env, but constants are shared)
export const REFERRAL_MAX_COUNT = parseInt(process.env.REFERRAL_MAX_COUNT || '10');
export const REFERRAL_POINTS_PER_SIGNUP = parseInt(process.env.REFERRAL_POINTS_PER_SIGNUP || '10');
export const REFERRAL_POINTS_PER_USAGE = parseInt(process.env.REFERRAL_POINTS_PER_USAGE || '10');
export const REFERRAL_MAX_POINTS = parseInt(process.env.REFERRAL_MAX_POINTS || '100');
