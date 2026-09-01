import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-950 px-4 py-12">
      <AuthForm mode="reset" />
    </div>
  );
}
