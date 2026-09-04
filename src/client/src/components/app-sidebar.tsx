import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Compass,
  Users,
  FolderGit2,
  HelpCircle,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronsUpDown,
  ShieldAlert,
  LogIn,
  Home,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth, useSystemSettings } from "@/lib/api";
import { getDiceBearAvatar } from "@/lib/constants";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { helpDocsUrl } = useSystemSettings();
  const { isMobile } = useSidebar();

  const navDiscover = [
    { title: "Home", url: "/", icon: Home },
    { title: "Explore Peers", url: "/explore", icon: Compass },
    { title: "Teams & Projects", url: "/teams", icon: Users },
  ];

  const navPersonal = [
    { title: "My Teams", url: "/teams/my", icon: FolderGit2 },
  ];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 bg-sidebar"
      {...props}
    >
      {/* 1. Header: Logo */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-8 hover:bg-sidebar-accent/50 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-0 transition-colors"
            >
              <Link
                to="/"
                title="UMBC Home"
                className="flex items-center group-data-[collapsible=icon]:justify-center px-1 group-data-[collapsible=icon]:px-0"
              >
                <img
                  src="/logo.svg"
                  alt="UMBC"
                  className="h-3.5 w-auto object-contain group-data-[collapsible=icon]:hidden mt-2 ml-2"
                />
                <img
                  src="/favicon.svg"
                  alt="UMBC"
                  className="hidden size-full object-contain rounded group-data-[collapsible=icon]:block"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. Content: Discover, Personal, Help & Docs (matches docs/sidebar.png) */}
      <SidebarContent className="gap-1">
        {/* Discover Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">
            Discover
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navDiscover.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : ""
                      }
                    >
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Personal Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">
            Personal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPersonal.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : ""
                      }
                    >
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <Icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Console (if Admin) */}
        {user?.role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === "/admin"}
                    tooltip="Admin Console"
                    className={
                      location.pathname === "/admin"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : ""
                    }
                  >
                    <Link to="/admin" className="flex items-center gap-2.5">
                      <ShieldAlert className="size-4" />
                      <span>Admin Console</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Help & Docs Group (at bottom of content) */}
        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Help & Docs">
                  <a
                    href={helpDocsUrl}
                    target={
                      helpDocsUrl.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      helpDocsUrl.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <HelpCircle className="size-4" />
                    <span>Help & Docs</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 3. Footer: User Profile Button with DropdownMenu (matches docs/sidebar.png) */}
      <SidebarFooter className="border-t border-border/30 p-2">
        {user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg border border-border/50">
                      <AvatarImage
                        src={getDiceBearAvatar(user.avatarSeed)}
                        alt={user.name}
                      />
                      <AvatarFallback className="rounded-lg text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-xs leading-tight">
                      <span className="truncate font-semibold text-foreground">
                        {user.name}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {user.nim}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-3.5 opacity-50" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-xl border border-sidebar-border bg-sidebar p-1 shadow-lg text-sidebar-foreground"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={6}
                >
                  <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex items-center gap-2.5 text-left text-xs">
                      <Avatar className="size-8 rounded-lg border border-border/50">
                        <AvatarImage
                          src={getDiceBearAvatar(user.avatarSeed)}
                          alt={user.name}
                        />
                        <AvatarFallback className="rounded-lg">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-semibold text-foreground">
                          {user.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {user.email || `${user.nim}@student.mercubuana.ac.id`}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-sidebar-border" />
                  <DropdownMenuItem
                    asChild
                    className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  >
                    <Link
                      to={`/profile/${user.nim}`}
                      className="cursor-pointer gap-2 text-xs py-2"
                    >
                      <UserIcon className="size-3.5" />
                      <span>View Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  >
                    <Link
                      to="/settings"
                      className="cursor-pointer gap-2 text-xs py-2"
                    >
                      <Settings className="size-3.5" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-sidebar-border" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer gap-2 text-xs py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="size-3.5" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="p-1">
            <Link to="/sign-in" className="w-full">
              <Button
                size="sm"
                className="w-full gap-2 h-8 text-xs font-semibold"
              >
                <LogIn className="size-3.5" />
                <span>Sign In</span>
              </Button>
            </Link>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
