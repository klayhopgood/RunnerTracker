import { AuthForm } from "@/components/auth/AuthForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <AuthForm mode="signup" />
    </div>
  );
}
