import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  runtime: z.literal('cloudflare'),
});

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
