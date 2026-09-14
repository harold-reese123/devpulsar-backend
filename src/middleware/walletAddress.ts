import { NextFunction, Request, Response } from 'express';

declare global {
  // `declare global { namespace X }` is the required TS syntax for
  // augmenting an existing ambient namespace like Express's — there's no
  // ES2015-module equivalent for this kind of declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The connected wallet making the request, from the frontend's X-Wallet-Address header. */
      walletAddress?: string;
    }
  }
}

/**
 * Reads the frontend's `X-Wallet-Address` header — set automatically by its
 * Axios interceptor on every request — and attaches it as `req.walletAddress`.
 * This is the *caller's* identity: who is asking.
 *
 * It is deliberately NOT used by /contributions/:address or /rewards/:address.
 * Those routes' `:address` path param is *whose* data is being requested, and
 * is the sole source of truth for them — e.g. a leaderboard entry links to
 * another contributor's public /contributions/:address regardless of which
 * wallet is currently connected in the caller's browser. There's no
 * signature verification in this identity model (see README's Identity
 * Model), so header vs. path is never cross-checked; the header is carried
 * for future routes that act on "the calling wallet" rather than "a given
 * address" (e.g. a personalized view, or write actions).
 */
export function walletAddress(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('X-Wallet-Address');
  if (header) {
    req.walletAddress = header;
  }
  next();
}
