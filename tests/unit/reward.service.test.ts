import { HydratedDocument } from 'mongoose';
import { sumClaimableUsdc } from '../../src/services/reward.service';
import { RewardDistributionDocument } from '../../src/models/RewardDistribution';

// sumClaimableUsdc only reads `status` and `amountUsdc`, so plain objects
// stand in for HydratedDocument<RewardDistributionDocument> here — no
// Mongoose connection needed for this pure-logic test.
function distribution(
  status: RewardDistributionDocument['status'],
  amountUsdc: string,
): HydratedDocument<RewardDistributionDocument> {
  return { status, amountUsdc } as HydratedDocument<RewardDistributionDocument>;
}

describe('sumClaimableUsdc', () => {
  it('sums only claimable distributions, ignoring claimed ones', () => {
    const distributions = [
      distribution('claimable', '100.00'),
      distribution('claimed', '50.00'),
      distribution('claimable', '25.50'),
    ];

    expect(sumClaimableUsdc(distributions)).toBe('125.50');
  });

  it('returns "0.00" when there are no claimable distributions', () => {
    const distributions = [distribution('claimed', '75.00'), distribution('claimed', '10.00')];

    expect(sumClaimableUsdc(distributions)).toBe('0.00');
  });

  it('returns "0.00" for an empty list', () => {
    expect(sumClaimableUsdc([])).toBe('0.00');
  });

  it('formats the total to exactly two decimal places', () => {
    const distributions = [distribution('claimable', '10.005'), distribution('claimable', '0.1')];

    expect(sumClaimableUsdc(distributions)).toBe('10.11');
  });
});
