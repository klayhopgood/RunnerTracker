import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permanently deletes the signed-in user's account and all associated data.
 *
 * Deletion order matters: sessions.device_id references devices with no
 * cascade, so sessions (and their track_points) must go before devices.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: sessions, error: sessionsQueryError } = await admin
    .from("sessions")
    .select("id")
    .eq("user_id", user.id);
  if (sessionsQueryError) {
    return NextResponse.json(
      { error: "Failed to delete account data" },
      { status: 500 }
    );
  }

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const steps: Array<() => PromiseLike<{ error: { message: string } | null }>> = [
    ...(sessionIds.length > 0
      ? [
          () => admin.from("track_points").delete().in("session_id", sessionIds),
          () => admin.from("sessions").delete().eq("user_id", user.id),
        ]
      : []),
    () => admin.from("devices").delete().eq("user_id", user.id),
    () => admin.from("pairing_codes").delete().eq("user_id", user.id),
    () => admin.from("profiles").delete().eq("id", user.id),
  ];

  for (const step of steps) {
    const { error } = await step();
    if (error) {
      console.error("Account deletion failed:", error.message);
      return NextResponse.json(
        { error: "Failed to delete account data" },
        { status: 500 }
      );
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error("Account deletion failed:", deleteUserError.message);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  // Clear the (now orphaned) session cookies.
  try {
    await supabase.auth.signOut();
  } catch {
    // The user no longer exists; a signOut API error here is harmless.
  }

  return NextResponse.json({ ok: true });
}
