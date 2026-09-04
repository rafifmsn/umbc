import * as React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Trash2,
  Search,
  CheckCheck,
  Inbox,
  AlertCircle,
  MessageSquare,
  Users,
  Radio,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, fetchApi } from "@/lib/api";
import { getDiceBearAvatar } from "@/lib/constants";

interface NotificationItem {
  id: string;
  type: "SEMESTER_CHECK" | "NOTE" | "TEAM_INVITE" | "SYSTEM_BROADCAST" | string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    nim: string;
    avatarSeed: string;
  };
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffSec < 172800) return "Yesterday";
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return "";
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "NOTE":
      return MessageSquare;
    case "TEAM_INVITE":
      return Users;
    case "SEMESTER_CHECK":
      return AlertCircle;
    case "SYSTEM_BROADCAST":
      return Radio;
    default:
      return Inbox;
  }
}

export function NotificationInbox() {
  const { user, unreadCount, setUnreadCount } = useAuth();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const loadNotifications = async () => {
    const { data } = await fetchApi<{
      data: NotificationItem[];
      unreadCount: number;
    }>("/api/notifications");
    if (data) {
      setNotifications(data.data);
      setUnreadCount(data.unreadCount);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasUnread = notifications.find((n) => n.id === id)?.read === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    await fetchApi(`/api/notifications/${id}`, { method: "DELETE" });
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    setNotifications([]);
    setUnreadCount(0);
    await fetchApi("/api/notifications", { method: "DELETE" });
  };

  const markAsRead = async (id: string) => {
    await fetchApi(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetchApi("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  React.useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  if (!user) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.sender?.name.toLowerCase().includes(q)
    );
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (val) loadNotifications();
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-md text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
          title="Inbox Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-red-500" />
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-l border-border shadow-2xl [&>button.absolute]:hidden"
      >
        {/* Inbox Header matching docs/top bar.png with aligned close button */}
        <SheetHeader className="p-4 border-b border-border/50 text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                Inbox
              </SheetTitle>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Mark read</span>
                </Button>
              )}

              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteAllNotifications}
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                  title="Delete all notifications"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete all</span>
                </Button>
              )}

              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted ml-0.5"
                  title="Close inbox"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Student direct notes, squad invitations, and campus updates
          </SheetDescription>
        </SheetHeader>

        {/* Search Bar matching docs/top bar.png ("Type to search...") */}
        <div className="p-3 border-b border-border/40 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Type to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/80 border-border/60"
            />
          </div>
        </div>

        {/* Notifications List matching docs/top bar.png style */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              const Icon = getNotificationIcon(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`group relative flex items-start gap-3 p-4 transition-colors cursor-pointer hover:bg-muted/40 ${
                    n.read ? "bg-transparent opacity-80" : "bg-primary/[0.04]"
                  }`}
                >
                  {n.sender?.nim ? (
                    <Link
                      to={`/profile/${n.sender.nim}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                      }}
                      className="size-9 shrink-0 rounded-full hover:opacity-80 transition-opacity mt-0.5"
                      title={`View ${n.sender.name}'s profile`}
                    >
                      <Avatar className="size-9 rounded-full border border-border/60">
                        <AvatarImage
                          src={getDiceBearAvatar(n.sender.avatarSeed)}
                          alt={n.sender.name}
                        />
                        <AvatarFallback className="text-xs font-medium">
                          {n.sender.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : n.sender?.avatarSeed ? (
                    <Avatar className="size-9 shrink-0 rounded-full border border-border/60 mt-0.5">
                      <AvatarImage
                        src={getDiceBearAvatar(n.sender.avatarSeed)}
                        alt={n.sender.name}
                      />
                      <AvatarFallback className="text-xs font-medium">
                        {n.sender.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="size-9 shrink-0 rounded-full border border-border/60 bg-muted flex items-center justify-center mt-0.5">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      {n.sender?.nim ? (
                        <Link
                          to={`/profile/${n.sender.nim}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                          }}
                          className="truncate text-xs font-semibold text-foreground hover:underline"
                        >
                          {n.sender.name}
                        </Link>
                      ) : (
                        <span className="truncate text-xs font-semibold text-foreground">
                          {n.title}
                        </span>
                      )}
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-foreground/95 line-clamp-1">
                      {n.title}
                    </p>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {/* Immediate delete button on hover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => deleteNotification(n.id, e)}
                    className="size-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    title="Delete notification"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
              <Inbox className="size-8 opacity-40" />
              <span>
                {searchQuery
                  ? "No notifications match your search query."
                  : "Your inbox is completely clear."}
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
