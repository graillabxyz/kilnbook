import { z } from "zod";

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type KilnbookEnv = z.infer<typeof envSchema>;

export function readClientSupabaseEnv(source?: NodeJS.ProcessEnv) {
  const publicEnv = source ?? {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  return envSchema
    .pick({
      NEXT_PUBLIC_SUPABASE_URL: true,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
      NEXT_PUBLIC_APP_URL: true,
    })
    .safeParse(publicEnv);
}
