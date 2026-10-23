import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronsUpDown, LogOut, RotateCcw } from "lucide-react";
import { Link } from "@/components/core/Link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getDemoApp, useAuth } from "@/lib/app";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { DemoNote } from "./DemoNote";

export interface AccountMenuProps {
  /** Where sign out goes (default "/login"). */
  loginTo?: string;
  className?: string;
}

const roleLabel = (role: string) => (role === "admin" ? "Admin" : "Member");

/**
 * The signed-in account in the sidebar footer: a button that opens the account card (name, email, role, the demo note),
 * "Reset demo data" (asks first, inside the card) and "Sign out". Needs a demo app (createDemoApp).
 */
export function AccountMenu({ loginTo = "/login", className }: AccountMenuProps) {
  const { status, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (status === "loading") return null;
  if (!user) {
    return (
      <Link to={loginTo} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full", className)}>
        Sign in
      </Link>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirming(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-app-account
          aria-label="Account menu"
          className={cn(
            "flex w-full items-center gap-2 rounded-md p-2 text-start transition-colors duration-(--duration-fast) hover:bg-surface-2 data-[state=open]:bg-surface-2",
            className,
          )}
        >
          <Avatar name={user.name} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">{user.name}</span>
            <span className="block truncate text-xs text-muted">{roleLabel(user.role)}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={user.role === "admin" ? "default" : "soft"}>{roleLabel(user.role)}</Badge>
          {user.title ? <span className="text-xs text-muted">{user.title}</span> : null}
        </div>
        <DemoNote className="mt-3" />
        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
          {confirming ? (
            <div role="group" aria-label="Confirm reset" className="flex flex-col gap-2">
              <p className="text-sm text-fg">Reset all demo data in this browser? Anything you added or changed is lost.</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    getDemoApp().reset();
                    setConfirming(false);
                    setOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => setConfirming(true)}>
              <RotateCcw aria-hidden="true" />
              Reset demo data
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              setOpen(false);
              signOut();
              void navigate(loginTo, { replace: true });
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
