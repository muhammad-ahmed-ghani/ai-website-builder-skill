import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Heading } from "@/components/core/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath, useAuth, type Account } from "@/lib/app";
import { DemoCredentials } from "./DemoCredentials";

export interface SignInFormProps {
  /** The demo accounts to show (import `demoAccounts` from "@/app/accounts"). */
  accounts: readonly Account[];
  /** Where a successful sign-in goes when there is no `?next=` (default "/"). Keep it equal to the guest AuthGate's homeTo. */
  redirectTo?: string;
  /** Show the demo accounts under the form (default true). Never turn this off in a demo: the credentials must be visible. */
  credentials?: boolean;
  /** The page's h1 (default "Sign in"). SignInForm renders the heading: do not add another h1. */
  title?: string;
  submitLabel?: string;
}

const BUSY_MS = 250;

/**
 * The sign-in screen content: a form against the current demo app's accounts, with the credentials in the placeholders, in a
 * "Demo: email / password" line and in a box under the form whose "Use this account" buttons fill the fields. Wrap it in
 * <AuthGate guest title="Sign in"> and give the page a <Seo noindex>.
 */
export function SignInForm({ accounts, redirectTo = "/", credentials = true, title = "Sign in", submitLabel = "Sign in" }: SignInFormProps) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uid = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = accounts[0];

  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = (typedEmail: string, typedPassword: string) => {
    const result = signIn(typedEmail, typedPassword);
    if (result.ok) {
      void navigate(safeNextPath(params.get("next")) ?? redirectTo, { replace: true });
      return;
    }
    setError(result.message);
    setBusy(false);
    (result.code === "wrong-password" || result.code === "disabled" ? passwordRef : emailRef).current?.focus();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const typedEmail = String(data.get("email") ?? "");
    const typedPassword = String(data.get("password") ?? "");
    setError("");
    if (!typedEmail.trim() || !typedPassword) return finish(typedEmail, typedPassword); // nothing to wait for
    setBusy(true);
    timer.current = setTimeout(() => finish(typedEmail, typedPassword), BUSY_MS);
  };

  const use = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    submitRef.current?.focus();
  };

  const help = `${uid}-help`;
  const alert = `${uid}-error`;
  return (
    <div data-signin-root className="mx-auto flex w-full max-w-md flex-col gap-6">
      <form data-signin onSubmit={onSubmit} noValidate aria-busy={busy} className="flex flex-col gap-4">
        <Heading level={1} size="2xl">
          {title}
        </Heading>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-email`}>Email</Label>
          <Input
            ref={emailRef}
            id={`${uid}-email`}
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            placeholder={first?.email}
            aria-describedby={`${help} ${alert}`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${uid}-password`}>Password</Label>
          <Input
            ref={passwordRef}
            id={`${uid}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            placeholder={first?.password}
            aria-describedby={`${help} ${alert}`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {first ? (
          <p id={help} className="text-sm text-muted">
            {`Demo: ${first.email} / ${first.password}`}
          </p>
        ) : null}
        <div id={alert} role="alert" data-signin-error className="text-sm text-danger empty:hidden">
          {error}
        </div>
        <Button ref={submitRef} type="submit" size="lg" disabled={busy}>
          {busy ? "Signing in" : submitLabel}
        </Button>
      </form>
      {credentials ? <DemoCredentials accounts={accounts} onUse={use} /> : null}
    </div>
  );
}
