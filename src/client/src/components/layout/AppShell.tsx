import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, Mail } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationInbox } from "@/components/notification-inbox";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useAuth, useSystemSettings } from "@/lib/api";

export interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface AppShellProps {
  title?: string;
  breadcrumbs?: BreadcrumbItemType[];
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  breadcrumbs,
  children,
}) => {
  const location = useLocation();
  const { user, needsSemesterUpdate } = useAuth();
  const { supportEmail } = useSystemSettings();

  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentSection =
    pathParts.length === 0
      ? "Home"
      : pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background text-foreground flex flex-col min-h-screen">
        {/* Top bar with Breadcrumbs & Actions (matches shadcn dashboard header) */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/"
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      UMBC
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                {breadcrumbs && breadcrumbs.length > 0 ? (
                  breadcrumbs.map((b, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={b.label}>
                        <BreadcrumbItem>
                          {b.href && !isLast ? (
                            <BreadcrumbLink asChild>
                              <Link
                                to={b.href}
                                className="text-muted-foreground hover:text-foreground text-xs"
                              >
                                {b.label}
                              </Link>
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="font-semibold text-foreground text-xs truncate max-w-[160px] sm:max-w-xs">
                              {b.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator />}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground text-xs">
                      {title || currentSection}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationInbox />
                {(() => {
                  const supportHref =
                    supportEmail.startsWith("http://") ||
                    supportEmail.startsWith("https://") ||
                    supportEmail.startsWith("mailto:")
                      ? supportEmail
                      : supportEmail.includes("@")
                        ? `mailto:${supportEmail}?subject=UMBC%20Inquiry`
                        : `https://${supportEmail}`;
                  return (
                    <a
                      href={supportHref}
                      target={
                        supportHref.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        supportHref.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      title="Contact Support"
                    >
                      <Mail className="size-4" />
                    </a>
                  );
                })()}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/sign-in">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link to="/sign-up">
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold bg-primary text-primary-foreground"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {needsSemesterUpdate && (
          <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-400">
            <div className="flex items-center space-x-2">
              <AlertCircle className="size-4 shrink-0 text-amber-400" />
              <span>
                Your semester profile has not been verified in over 6 months.
              </span>
            </div>
            <Link
              to="/settings"
              className="font-medium underline underline-offset-4 hover:text-amber-300"
            >
              Update Semester
            </Link>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
