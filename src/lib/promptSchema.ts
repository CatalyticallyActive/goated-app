import { z } from 'zod';

export const PromptSchema = z.object({
  prompt_template: z.string().min(10),  // Required, at least 10 chars
  version: z.string().optional(),
  description: z.string().optional(),
  variables: z.record(z.string()).optional()  // Placeholders like {trading_style}
});

export type PromptType = z.infer<typeof PromptSchema>; 