"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Mail, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "../../../shared/components/ui/sidebar";
import { authClient } from "../../../shared/lib/auth/client";
import { navItems } from "../lib/nav.lib";

interface AppSidebarProps {
  userEmail: string | null | undefined;
  userName?: string | null;
}

export function AppSidebar({ userEmail, userName }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Sidebar collapsible="icon">
      {/* Header */}
      <SidebarHeader className="px-4 py-5">
        <span className="text-lg font-bold bg-linear-to-r from-brand-dark to-brand-light bg-clip-text text-transparent truncate">
          OpenClaw
        </span>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer — sign out + user email */}
      <SidebarFooter className="px-3 py-4 gap-2">
        {/* Sign out button */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Sign out"
              className="text-error hover:text-error/80 hover:bg-error/10"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator />

        {/* User info */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-dark to-brand text-xs font-bold text-white uppercase">
            {userName?.[0] ?? userEmail?.[0] ?? "U"}
          </div>
          <div className="flex min-w-0 flex-col">
            {userName && (
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {userName}
              </span>
            )}
            <span className="truncate text-xs text-sidebar-foreground/60 flex items-center gap-1">
              <Mail className="size-3 shrink-0" />
              {userEmail ?? "—"}
            </span>
          </div>
        </div>
      </SidebarFooter>

    </Sidebar>
  );
}
