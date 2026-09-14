import { Contribution } from '../models/Contribution';
import { Contributor } from '../models/Contributor';
import { getCurrentWave } from './wave.service';

export type LeaderboardScope = 'wave' | 'all-time';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  githubUsername?: string;
  points: number;
}

export function getContributionsByAddress(walletAddress: string) {
  return Contribution.find({ walletAddress }).sort({ mergedAt: -1 });
}

/**
 * 'wave' scope ranks only the current active wave's points; if there is no
 * active wave right now, there's nothing to rank and this returns [].
 * 'all-time' scope sums points across every Contribution ever recorded —
 * there's no cached total on Contributor, by design (see Phase 2 notes),
 * so it's computed fresh here.
 *
 * Ties are broken by walletAddress ascending, for a stable, deterministic
 * order — the README doesn't specify tie-breaking.
 */
export async function getLeaderboard(scope: LeaderboardScope): Promise<LeaderboardEntry[]> {
  const match: Record<string, unknown> = {};

  if (scope === 'wave') {
    const currentWave = await getCurrentWave();
    if (!currentWave) return [];
    match.waveId = currentWave._id;
  }

  const totals = await Contribution.aggregate<{ _id: string; points: number }>([
    { $match: match },
    { $group: { _id: '$walletAddress', points: { $sum: '$points' } } },
    { $sort: { points: -1, _id: 1 } },
  ]);

  if (totals.length === 0) return [];

  const contributors = await Contributor.find({
    walletAddress: { $in: totals.map((t) => t._id) },
  });
  const githubUsernameByAddress = new Map(contributors.map((c) => [c.walletAddress, c.githubUsername]));

  return totals.map((total, index) => {
    const entry: LeaderboardEntry = {
      rank: index + 1,
      address: total._id,
      points: total.points,
    };
    const githubUsername = githubUsernameByAddress.get(total._id);
    if (githubUsername) {
      entry.githubUsername = githubUsername;
    }
    return entry;
  });
}
