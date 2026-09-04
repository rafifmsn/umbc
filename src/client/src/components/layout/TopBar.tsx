import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationInbox } from "@/components/notification-inbox";
import { useAuth } from "@/lib/api";
import { getDiceBearAvatar } from "@/lib/constants";

export const TopBar: React.FC<{ title?: string }> = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center space-x-3">
        <h1 className="text-base font-semibold text-foreground">
          {title || "Universitas Mercu Buana Connect"}
        </h1>
      </div>

      <div className="flex items-center space-x-3">
        {user?.role === "ADMIN" && (
          <Link
            to="/admin"
            className="flex items-center space-x-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Admin</span>
          </Link>
        )}

        {user ? (
          <>
            <NotificationInbox />
            <a
              href="mailto:connect@mercubuana.ac.id?subject=UMBC%20Inquiry"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Support & Inquiries (connect@mercubuana.ac.id)"
            >
              <Mail className="size-4" />
              <span className="sr-only">Support & Inquiries</span>
            </a>

            <div className="flex items-center space-x-2 pl-2 border-l border-border">
              <Link
                to={`/profile/${user.nim}`}
                className="flex items-center space-x-2 rounded-full p-0.5 hover:ring-1 hover:ring-border transition-all"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={getDiceBearAvatar(user.avatarSeed)}
                    alt={user.name}
                  />
                  <AvatarFallback>
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <Link to="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
