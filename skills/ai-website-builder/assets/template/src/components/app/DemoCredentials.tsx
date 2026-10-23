import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DemoCredential {
  name: string;
  email: string;
  password: string;
  role: string;
  title?: string;
}

export interface DemoCredentialsProps {
  accounts: readonly DemoCredential[];
  /** Adds a "Use this account" button to every row. */
  onUse?: (account: DemoCredential) => void;
  title?: string;
  className?: string;
}

const roleLabel = (role: string) => (role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member");

/**
 * The demo accounts with their credentials, in plain sight. Pure markup with no state, so it is part of the prerendered HTML of the
 * login page: the credentials are there before any script runs. Nothing here is real, and the box says so.
 */
export function DemoCredentials({ accounts, onUse, title = "Demo accounts", className }: DemoCredentialsProps) {
  return (
    <section data-demo-credentials aria-labelledby="demo-credentials-title" className={cn("rounded-lg border border-line bg-surface p-4", className)}>
      <h2 id="demo-credentials-title" className="font-display text-base font-semibold text-fg">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">Nothing here is real. Sign-in is checked in this browser against these accounts.</p>
      <ul className="mt-3 divide-y divide-line">
        {accounts.map((account) => (
          <li key={account.email} data-demo-account={account.email} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge variant={account.role === "admin" ? "default" : "soft"}>{roleLabel(account.role)}</Badge>
              <span className="text-sm font-medium text-fg">{account.name}</span>
              {account.title ? <span className="text-sm text-muted">{account.title}</span> : null}
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted">Email</dt>
              <dd>
                <code className="font-mono break-all text-fg select-all">{account.email}</code>
              </dd>
              <dt className="text-muted">Password</dt>
              <dd>
                <code className="font-mono break-all text-fg select-all">{account.password}</code>
              </dd>
            </dl>
            {onUse ? (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onUse(account)}>
                Use this account<span className="sr-only"> for {account.name}</span>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
