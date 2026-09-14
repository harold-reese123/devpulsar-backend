import { Router } from 'express';

export const webhooksRouter = Router();

// Not implemented in v1 — contribution data is seeded/mocked for now (see
// README's "GitHub Webhook Setup" section). Real ingestion (signature
// verification via GITHUB_WEBHOOK_SECRET, pull_request event handling,
// points assignment on merge) is a planned follow-up phase.
webhooksRouter.post('/github', (_req, res) => {
  res.status(501).json({ error: 'GitHub webhook ingestion is not implemented yet' });
});
