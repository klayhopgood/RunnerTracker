import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";

const createSchema = z
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      slug: nanoid(12),
      display_name: input.displayName,
      visibility: input.visibility,
      viewer_password_hash: input.viewerPassword
        ? await bcrypt.hash(input.viewerPassword, 10)
        : null,
      countdown_seconds: input.countdownSeconds,
      auto_stop_minutes: input.autoStopMinutes,
    })
    .select("id, slug, display_name, visibility, status, created_at")
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: "Could not create session" },
      { status: 500 }
    );
  }
  return NextResponse.json({ session });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, slug, display_name, visibility, status, units, countdown_seconds, auto_stop_minutes, started_at, ended_at, distance_meters, elevation_gain_meters, duration_seconds, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ sessions: sessions ?? [] });
}
