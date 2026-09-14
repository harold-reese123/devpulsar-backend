import { faker } from '@faker-js/faker';
import { Contributor } from '../models/Contributor';
import { Wave, WaveStatus } from '../models/Wave';
import { Contribution, ContributionStatus } from '../models/Contribution';
import { RewardDistribution, RewardDistributionStatus } from '../models/RewardDistribution';
import { logger } from '../utils/logger';

const REPOS = [
  'devpulsar/devpulsar-backend',
  'devpulsar/devpulsar-frontend',
  'devpulsar/soroban-contracts',
  'stellar/js-stellar-sdk',
  'devpulsar/docs',
];

// Trivial / Medium / High tiers, per the README's Drips Wave convention.
const POINTS_TIERS = [100, 150, 200];

const USDC_PER_POINT = 1.5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const STELLAR_ADDRESS_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function fakeStellarAddress(): string {
  let out = 'G';
  for (let i = 0; i < 55; i++) {
    out += STELLAR_ADDRESS_ALPHABET[Math.floor(Math.random() * STELLAR_ADDRESS_ALPHABET.length)];
  }
  return out;
}

function fakeTxHash(): string {
  return faker.string.hexadecimal({ length: 64, casing: 'lower', prefix: '' });
}

function usdc(amount: number): string {
  return amount.toFixed(2);
}

interface WaveDef {
  label: string;
  status: WaveStatus;
  startAt: Date;
  endAt: Date;
  /** Contribution status to assign to every contribution merged in this wave. */
  contributionStatus: ContributionStatus;
  /** Whether this wave has been closed and reward distributions created for it. */
  hasDistributions: boolean;
  distributionStatus: RewardDistributionStatus;
}

function buildWaveDefs(now: Date): WaveDef[] {
  return [
    {
      label: 'Wave 9',
      status: 'completed',
      startAt: new Date(now.getTime() - 8 * WEEK_MS),
      endAt: new Date(now.getTime() - 6 * WEEK_MS),
      contributionStatus: 'rewarded',
      hasDistributions: true,
      distributionStatus: 'claimed',
    },
    {
      label: 'Wave 10',
      status: 'completed',
      startAt: new Date(now.getTime() - 6 * WEEK_MS),
      endAt: new Date(now.getTime() - 4 * WEEK_MS),
      contributionStatus: 'rewarded',
      hasDistributions: true,
      distributionStatus: 'claimed',
    },
    {
      label: 'Wave 11',
      status: 'completed',
      startAt: new Date(now.getTime() - 4 * WEEK_MS),
      endAt: new Date(now.getTime() - 2 * WEEK_MS),
      contributionStatus: 'reward_queued',
      hasDistributions: true,
      distributionStatus: 'claimable',
    },
    {
      label: 'Wave 12',
      status: 'active',
      startAt: new Date(now.getTime() - 2 * WEEK_MS),
      endAt: new Date(now.getTime() + 2 * WEEK_MS),
      contributionStatus: 'points_assigned',
      hasDistributions: false,
      distributionStatus: 'claimable',
    },
  ];
}

export async function seedDatabase(): Promise<void> {
  logger.info('Clearing existing collections...');
  await Promise.all([
    Contributor.deleteMany({}),
    Wave.deleteMany({}),
    Contribution.deleteMany({}),
    RewardDistribution.deleteMany({}),
  ]);

  logger.info('Creating contributors...');
  const contributorDocs = await Contributor.insertMany(
    Array.from({ length: 8 }, () => ({
      walletAddress: fakeStellarAddress(),
      githubUsername: Math.random() < 0.7 ? faker.internet.username().toLowerCase() : undefined,
    })),
  );
  const walletAddresses = contributorDocs.map((c) => c.walletAddress);

  logger.info('Creating waves and their contributions/rewards...');
  const waveDefs = buildWaveDefs(new Date());

  for (const def of waveDefs) {
    const wave = await Wave.create({
      label: def.label,
      status: def.status,
      startAt: def.startAt,
      endAt: def.endAt,
      totalPointsDistributed: 0,
      totalRewardsUsdc: '0.00',
      participantCount: 0,
    });

    const pointsByWallet = new Map<string, number>();

    for (const walletAddress of walletAddresses) {
      // Not every contributor participates in every wave.
      if (Math.random() > 0.8) continue;

      const contributionCount = 1 + Math.floor(Math.random() * 4);
      let walletPoints = 0;

      for (let i = 0; i < contributionCount; i++) {
        const repo = faker.helpers.arrayElement(REPOS);
        const prNumber = faker.number.int({ min: 10, max: 999 });
        const points = faker.helpers.arrayElement(POINTS_TIERS);
        walletPoints += points;

        await Contribution.create({
          repo,
          prNumber,
          prUrl: `https://github.com/${repo}/pull/${prNumber}`,
          title: faker.git.commitMessage(),
          points,
          status: def.contributionStatus,
          mergedAt: faker.date.between({ from: def.startAt, to: def.endAt }),
          waveId: wave._id,
          walletAddress,
        });
      }

      pointsByWallet.set(walletAddress, walletPoints);

      if (def.hasDistributions) {
        await RewardDistribution.create({
          waveId: wave._id,
          amountUsdc: usdc(walletPoints * USDC_PER_POINT),
          status: def.distributionStatus,
          txHash: def.distributionStatus === 'claimed' ? fakeTxHash() : null,
          distributedAt: def.endAt,
          walletAddress,
        });
      }
    }

    const totalPointsDistributed = [...pointsByWallet.values()].reduce((a, b) => a + b, 0);
    wave.totalPointsDistributed = totalPointsDistributed;
    wave.totalRewardsUsdc = usdc(totalPointsDistributed * USDC_PER_POINT);
    wave.participantCount = pointsByWallet.size;
    await wave.save();
  }

  logger.info('Seed complete.');
}
