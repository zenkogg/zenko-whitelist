/**
 * Bodies of the main backend's GET /api/config/games, shared by the gate
 * reader's tests and the tests of every waitlist surface that follows it.
 */

/* As production served it before the backend learned to say whether sign-in
   is gated: no closedBeta key. The games list is cut to one entry; nothing
   reads it. */
export const PRODUCTION_TODAY = {
  games: [{ id: 'lol', name: 'League of Legends' }],
  version: 1,
  wagerLimits: { maxConcurrentWagers: 10 },
  platformConfig: {
    cancelWindowMs: 180000,
    challengeDisputeWindowMs: 14400000,
    tournamentDisputeWindowMs: 43200000,
    minChallengeCredits: 100,
    minRedemptionUsdsui: 20000000,
    tournamentFeeBps: 500,
    tournamentMaxWinners: 25,
    tournamentMaxParticipants: 50,
    tournamentPlacementBps: {
      placement1: 4000,
      placement2: 2500,
      placement3: 1000,
      placement4Plus: 100,
    },
    repDisputeOpen: 50,
    composedMoneyEnabled: false,
    composedEntryCap: 500,
  },
};

export const GATE_OFF = { games: [], platformConfig: { closedBeta: false } };
export const GATE_ON = { games: [], platformConfig: { closedBeta: true } };
