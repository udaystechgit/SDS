import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, Mail } from "lucide-react";

import logo from "@/assets/brand/sds-logo-transparent.png";
import { getHomeRouteForRole } from "@/lib/auth-roles";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      void navigate({ to: getHomeRouteForRole(role) });
    }
  }, [isAuthenticated, isLoading, navigate, role]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const disabled = isLoading || isSubmitting;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_100%)]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_32px_80px_-48px_rgba(11,61,145,0.75)] lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col justify-between bg-[#0B3D91] px-6 py-8 text-white sm:px-8 lg:px-10">
            <div>
              <div>
                <p className="font-heading text-xl font-bold">SDS Consulting Services</p>
                <p className="text-xs text-white/75">Secure Portal Access</p>
              </div>

              <div className="mt-16 max-w-md">
                <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
                  Sign in to your SDS workspace
                </h1>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  Access is limited to accounts created by SDS administrators.
                </p>
              </div>
            </div>

            <p className="mt-12 text-xs text-white/60">
              AI data center operations, staffing, and service delivery portals.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-8 lg:px-12 lg:py-14">
            <div className="mx-auto w-full max-w-md">
              <img
                src={logo}
                alt="SDS Consulting Services"
                className="mb-8 h-auto w-40 object-contain sm:w-48"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#1DA1F2]">
                  Account Login
                </p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-[#0B3D91]">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Use the email and password assigned to your account.
                </p>
              </div>

              {errorMessage ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-800">Email</span>
                  <span className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2.5 transition focus-within:border-[#1DA1F2] focus-within:ring-2 focus-within:ring-[#1DA1F2]/20">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={disabled}
                      required
                      autoComplete="email"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="name@sdsconsultingservice.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-800">Password</span>
                  <span className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2.5 transition focus-within:border-[#1DA1F2] focus-within:ring-2 focus-within:ring-[#1DA1F2]/20">
                    <LockKeyhole className="h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={disabled}
                      required
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Enter your password"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={disabled}
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#0B3D91_0%,#1DA1F2_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_-18px_rgba(11,61,145,0.9)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting || isLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
