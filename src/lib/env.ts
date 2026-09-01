import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  VIEWER_TOKEN_SECRET: z.string().min(16).optional(),
});

export function serverEnv() {
  return serverEnvSchema.parse(process.env);
}

export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    maptilerKey: process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "",
  };
}
