'use client';

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import Image from 'next/image';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface AdminSession {
  idToken: string;
  email: string;
  name: string;
}

interface ReferralPerson {
  displayName: string | null;
  email: string | null;
}

interface User {
  id: string;
  oauthProvider: string;
  email: string | null;
  displayName: string | null;
  games: string[];
  referralCode: string;
  referralCount: number;
  reputationPoints: number;
  status: string;
  createdAt: string;
  usedReferralCode: string | null;
  referredBy: ReferralPerson | null;
  referrals: ReferralPerson[];
}

const STATUS_TOOLTIPS: Record<string, string> = {
  PENDING: 'Waiting for beta access',
  APPROVED: 'Selected for closed beta',
  INVITED: 'Invitation email sent',
  REGISTERED: 'Created Zenko account',
};

const STATUSES = ['PENDING', 'APPROVED', 'INVITED', 'REGISTERED'] as const;

const PROVIDER_ICONS: Record<string, string> = {
  google: '/images/icons/google.svg',
  twitch: '/images/icons/twitch.svg',
  twitter: '/images/icons/X.svg',
};

const PIE_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#e879f9'];
const PROVIDER_COLORS = ['#4285F4', '#9146FF', '#1DA1F2', '#f87171', '#34d399'];

type SortKey = 'order' | 'name' | 'referrals' | 'xp' | 'joined';
type SortDir = 'asc' | 'desc';

function statusClasses(status: string) {
  switch (status) {
    case 'REGISTERED':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'APPROVED':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'INVITED':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default:
      return 'bg-white/10 text-white/50 border-white/10';
  }
}

function getGoogleSignInUrl() {
  const redirectUri = `${window.location.origin}/admin/callback`;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: crypto.randomUUID(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block ${active ? 'text-purple-400' : 'text-white/20'}`}>
      {active ? (dir === 'asc' ? '\u2191' : '\u2193') : '\u2195'}
    </span>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [timelinePage, setTimelinePage] = useState(-1); // -1 means "latest page"
  const [gameFilter, setGameFilter] = useState<string>('all');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('admin_session');
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        localStorage.removeItem('admin_session');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session) return;

    fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${session.idToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem('admin_session');
          setSession(null);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.users) setUsers(data.users);
      })
      .catch(() => {
        localStorage.removeItem('admin_session');
        setSession(null);
      });
  }, [session]);

  // Build signup order map (oldest first = #1)
  const signupOrder = useMemo(() => {
    const sorted = [...users].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const map = new Map<string, number>();
    sorted.forEach((u, i) => map.set(u.id, i + 1));
    return map;
  }, [users]);

  const allGames = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.games.forEach((g) => set.add(g)));
    return [...set].sort();
  }, [users]);

  const filteredAndSortedUsers = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.referralCode.toLowerCase().includes(q)
      );
    }
    if (gameFilter !== 'all') {
      list = list.filter((u) => u.games.includes(gameFilter));
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'order':
          cmp = (signupOrder.get(a.id) ?? 0) - (signupOrder.get(b.id) ?? 0);
          break;
        case 'name':
          cmp = (a.displayName ?? '').localeCompare(b.displayName ?? '');
          break;
        case 'referrals':
          cmp = a.referralCount - b.referralCount;
          break;
        case 'xp':
          cmp = a.reputationPoints - b.reputationPoints;
          break;
        case 'joined':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [users, search, gameFilter, sortKey, sortDir, signupOrder]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: users.length,
      pending: users.filter((u) => u.status === 'PENDING').length,
      registered: users.filter((u) => u.status === 'REGISTERED').length,
      today: users.filter((u) => new Date(u.createdAt) >= today).length,
    };
  }, [users]);

  // Chart data: games distribution
  const gamesData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => u.games.forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [users]);

  // Chart data: provider distribution
  const providerData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.oauthProvider] = (counts[u.oauthProvider] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [users]);

  // Chart data: used referral code vs not
  const referralUsageData = useMemo(() => {
    const used = users.filter((u) => u.usedReferralCode).length;
    const notUsed = users.length - used;
    return [
      { name: 'Used a code', value: used },
      { name: 'No code', value: notUsed },
    ];
  }, [users]);

  // Chart data: invited others vs didn't
  const referralSuccessData = useMemo(() => {
    const invited = users.filter((u) => u.referralCount > 0).length;
    const notInvited = users.length - invited;
    return [
      { name: 'Invited others', value: invited },
      { name: 'No invites', value: notInvited },
    ];
  }, [users]);

  // Chart data: daily signups timeline
  const timelineData = useMemo(() => {
    if (users.length === 0) return [];
    const sorted = [...users].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const startDate = new Date(sorted[0].createdAt);
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const days: { date: string; count: number }[] = [];
    const cursor = new Date(startDate);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      days.push({ date: key, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    users.forEach((u) => {
      const key = new Date(u.createdAt).toISOString().slice(0, 10);
      const entry = days.find((d) => d.date === key);
      if (entry) entry.count++;
    });

    return days;
  }, [users]);

  // Group timeline data by month
  const timelineMonths = useMemo(() => {
    if (timelineData.length === 0) return [];
    const months: { key: string; label: string; days: typeof timelineData }[] = [];
    for (const day of timelineData) {
      const monthKey = day.date.slice(0, 7); // "2026-02"
      let month = months.find((m) => m.key === monthKey);
      if (!month) {
        const d = new Date(day.date + 'T00:00:00');
        month = {
          key: monthKey,
          label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          days: [],
        };
        months.push(month);
      }
      month.days.push(day);
    }
    return months;
  }, [timelineData]);

  const resolvedTimelinePage = timelinePage === -1 ? timelineMonths.length - 1 : Math.min(timelinePage, timelineMonths.length - 1);
  const currentMonth = timelineMonths[resolvedTimelinePage];

  const updateStatus = useCallback(
    async (userId: string, newStatus: string) => {
      if (!session) return;
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
        );
      }
    },
    [session]
  );

  function signOut() {
    localStorage.removeItem('admin_session');
    setSession(null);
    setUsers([]);
  }

  if (loading) {
    return (
      <>
        <BackgroundLayer />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <p className="text-white/60">Loading...</p>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <BackgroundLayer />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <button
            onClick={() => (window.location.href = getGoogleSignInUrl())}
            className="flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-800 shadow-lg transition hover:bg-gray-100"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </>
    );
  }

  const thBase = 'px-4 py-3 text-xs font-medium text-white/50 uppercase tracking-wider';
  const thSortable = `${thBase} cursor-pointer select-none hover:text-white/70 transition-colors`;

  return (
    <>
      <BackgroundLayer />
      <div className="relative z-10 min-h-screen p-4 sm:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">{session.email}</span>
            <button
              onClick={signOut}
              className="rounded bg-white/10 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/20"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Users', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'Registered', value: stats.registered },
            { label: 'Today', value: stats.today },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-white/5 p-4 border border-white/10">
              <p className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        {users.length > 0 && (
          <TooltipProvider>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Games pie */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Games Selected</p>
                    <ChartContainer
                      config={Object.fromEntries(
                        gamesData.map((g, i) => [g.name, { label: g.name, color: PIE_COLORS[i % PIE_COLORS.length] }])
                      ) as ChartConfig}
                      className="aspect-square max-h-[200px] mx-auto"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={gamesData} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="80%" paddingAngle={2}>
                          {gamesData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                      {gamesData.map((g, i) => (
                        <span key={g.name} className="flex items-center gap-1 text-xs text-white/60">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {g.name} ({g.value})
                        </span>
                      ))}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Distribution of games users selected during signup</TooltipContent>
              </Tooltip>

              {/* Provider pie */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Signup Platform</p>
                    <ChartContainer
                      config={Object.fromEntries(
                        providerData.map((p, i) => [p.name, { label: p.name, color: PROVIDER_COLORS[i % PROVIDER_COLORS.length] }])
                      ) as ChartConfig}
                      className="aspect-square max-h-[200px] mx-auto"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={providerData} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="80%" paddingAngle={2}>
                          {providerData.map((_, i) => (
                            <Cell key={i} fill={PROVIDER_COLORS[i % PROVIDER_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                      {providerData.map((p, i) => (
                        <span key={p.name} className="flex items-center gap-1 text-xs text-white/60">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PROVIDER_COLORS[i % PROVIDER_COLORS.length] }} />
                          {p.name} ({p.value})
                        </span>
                      ))}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Which OAuth provider users signed up with</TooltipContent>
              </Tooltip>

              {/* Referral usage pie */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Referral Code Usage</p>
                    <ChartContainer
                      config={{
                        used: { label: 'Used a code', color: '#a78bfa' },
                        notUsed: { label: 'No code', color: '#374151' },
                      }}
                      className="aspect-square max-h-[200px] mx-auto"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={referralUsageData} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="80%" paddingAngle={2}>
                          <Cell fill="#a78bfa" />
                          <Cell fill="#374151" />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                      {referralUsageData.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1 text-xs text-white/60">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? '#a78bfa' : '#374151' }} />
                          {d.name} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>How many users entered a referral code when signing up</TooltipContent>
              </Tooltip>

              {/* Referral success pie */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Referral Success</p>
                    <ChartContainer
                      config={{
                        invited: { label: 'Invited others', color: '#34d399' },
                        none: { label: 'No invites', color: '#374151' },
                      }}
                      className="aspect-square max-h-[200px] mx-auto"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={referralSuccessData} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="80%" paddingAngle={2}>
                          <Cell fill="#34d399" />
                          <Cell fill="#374151" />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center">
                      {referralSuccessData.map((d, i) => (
                        <span key={d.name} className="flex items-center gap-1 text-xs text-white/60">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: i === 0 ? '#34d399' : '#374151' }} />
                          {d.name} ({d.value})
                        </span>
                      ))}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Users who shared their code and got at least one signup</TooltipContent>
              </Tooltip>
            </div>

            {/* Daily signups timeline */}
            {currentMonth && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mb-6 rounded-lg bg-white/5 border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-white/50 uppercase tracking-wider">Daily Signups</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTimelinePage(Math.max(0, resolvedTimelinePage - 1))}
                          disabled={resolvedTimelinePage === 0}
                          className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60 transition hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          &larr;
                        </button>
                        <span className="text-xs text-white/60 min-w-[120px] text-center">
                          {currentMonth.label}
                        </span>
                        <button
                          onClick={() => setTimelinePage(Math.min(timelineMonths.length - 1, resolvedTimelinePage + 1))}
                          disabled={resolvedTimelinePage === timelineMonths.length - 1}
                          className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60 transition hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>
                    <ChartContainer
                      config={{ count: { label: 'Signups', color: '#a78bfa' } }}
                      className="h-[200px] w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-purple-500/10"
                    >
                      <BarChart data={currentMonth.days}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v: string) => {
                            const d = new Date(v + 'T00:00:00');
                            return d.toLocaleDateString('en-US', { day: 'numeric' });
                          }}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          cursor={{ fill: 'rgba(167, 139, 250, 0.1)' }}
                          labelFormatter={(v: string) => {
                            const d = new Date(v + 'T00:00:00');
                            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          }}
                        />
                        <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Number of new signups per day since the waitlist opened</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, email, or referral code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Table */}
        <TooltipProvider>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className={thSortable} onClick={() => toggleSort('order')}>
                    #<SortIcon active={sortKey === 'order'} dir={sortDir} />
                  </th>
                  <th className={thSortable} onClick={() => toggleSort('name')}>
                    Name<SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </th>
                  <th className={thBase}>Email</th>
                  <th className={thBase}>Provider</th>
                  <th className={thBase}>
                    <select
                      value={gameFilter}
                      onChange={(e) => setGameFilter(e.target.value)}
                      className="bg-transparent text-xs font-medium text-white/50 uppercase tracking-wider outline-none cursor-pointer hover:text-white/70 transition-colors"
                    >
                      <option value="all">All Games</option>
                      {allGames.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </th>
                  <th className={thBase}>Referral Code</th>
                  <th className={thSortable} onClick={() => toggleSort('referrals')}>
                    Referrals<SortIcon active={sortKey === 'referrals'} dir={sortDir} />
                  </th>
                  <th className={thSortable} onClick={() => toggleSort('xp')}>
                    XP<SortIcon active={sortKey === 'xp'} dir={sortDir} />
                  </th>
                  <th className={thBase}>Status</th>
                  <th className={thSortable} onClick={() => toggleSort('joined')}>
                    Joined<SortIcon active={sortKey === 'joined'} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user, i) => (
                  <Fragment key={user.id}>
                    <tr
                      onClick={() =>
                        setExpandedUserId((prev) => (prev === user.id ? null : user.id))
                      }
                      className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-white/[0.05] ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td className="px-4 py-3 text-white/40 tabular-nums">
                        {signupOrder.get(user.id)}
                      </td>
                      <td className="px-4 py-3 text-white">{user.displayName || '—'}</td>
                      <td className="px-4 py-3 text-white/80">{user.email || '—'}</td>
                      <td className="px-4 py-3 text-white/60">
                        <span className="flex items-center gap-1.5">
                          {PROVIDER_ICONS[user.oauthProvider] ? (
                            <Image
                              src={PROVIDER_ICONS[user.oauthProvider]}
                              alt={user.oauthProvider}
                              width={16}
                              height={16}
                              className="shrink-0"
                            />
                          ) : null}
                          <span className="capitalize">{user.oauthProvider}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{user.games.join(', ') || '—'}</td>
                      <td className="px-4 py-3">
                        <code className="text-purple-400 text-xs">{user.referralCode}</code>
                      </td>
                      <td className="px-4 py-3 text-white/80">{user.referralCount}</td>
                      <td className="px-4 py-3 text-white/80">{user.reputationPoints}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <select
                              value={user.status}
                              onChange={(e) => updateStatus(user.id, e.target.value)}
                              className={`appearance-none rounded-full border px-2 py-0.5 text-xs font-medium outline-none cursor-pointer ${statusClasses(user.status)}`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </TooltipTrigger>
                          <TooltipContent>
                            {STATUS_TOOLTIPS[user.status] || user.status}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>

                    {/* Expanded referral details */}
                    {expandedUserId === user.id && (
                      <tr className="border-b border-white/5">
                        <td colSpan={10} className="px-6 py-4 bg-white/[0.03]">
                          <div className="grid gap-4 sm:grid-cols-3 text-sm">
                            <div>
                              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                Used Referral Code
                              </p>
                              <p className="text-white/80">
                                {user.usedReferralCode ? (
                                  <code className="text-purple-400 text-xs">
                                    {user.usedReferralCode}
                                  </code>
                                ) : (
                                  <span className="text-white/30">None</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                Referred By
                              </p>
                              {user.referredBy ? (
                                <p className="text-white/80">
                                  {user.referredBy.displayName || 'Unknown'}{' '}
                                  <span className="text-white/40">
                                    ({user.referredBy.email || '—'})
                                  </span>
                                </p>
                              ) : (
                                <p className="text-white/30">No referrer</p>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                                Referred Users ({user.referrals.length})
                              </p>
                              {user.referrals.length > 0 ? (
                                <ul className="space-y-0.5">
                                  {user.referrals.map((r, idx) => (
                                    <li key={idx} className="text-white/80">
                                      {r.displayName || 'Unknown'}{' '}
                                      <span className="text-white/40">({r.email || '—'})</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-white/30">No referrals yet</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filteredAndSortedUsers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-white/30">
                      {users.length === 0 ? 'Loading users...' : 'No users match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      </div>
    </>
  );
}
