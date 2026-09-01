import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

/**
 * Shared validation + row construction for creating a run session, used by
 * both the cookie-authenticated /api/sessions route (dashboard) and the
 * device-token /api/tracker/sessions route (paired phone).
 */
export const createSessionSchema = z
  .object({
    displayName: z.string().min(1).max(80),
    visibility: z.enum(["public", "private"]),
    viewerPassword: z.string().min(4).max(100).optional(),
    countdownSeconds: z.number().int().min(0).max(3600).default(0),
    autoStopMinutes: z.number().int().min(1).max(24 * 60).nullable().default(null),
  })
  .refine((v) => v.visibility === "public" || !!v.viewerPassword, {
    message: "Private sessions need a viewer password",
  });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

/** Builds the sessions insert row (slug generation + password hashing). */
export async function buildSessionInsert(
  userId: string,
  input: CreateSessionInput
) {
  return {
    user_id: userId,
    slug: nanoid(12),
    display_name: input.displayName,
    visibility: input.visibility,
    viewer_password_hash: input.viewerPassword
      ? await bcrypt.hash(input.viewerPassword, 10)
      : null,
    countdown_seconds: input.countdownSeconds,
    auto_stop_minutes: input.autoStopMinutes,
  };
}
