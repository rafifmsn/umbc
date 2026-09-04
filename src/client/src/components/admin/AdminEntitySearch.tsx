import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import {
  getDiceBearAvatar,
  getCampusBadge,
  getMajorCode,
} from "@/lib/constants";
import {
  Search,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Check,
} from "lucide-react";

interface AdminUserResult {
  id: string;
  nim: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  campus: string;
  faculty: string;
  major: string;
  semester: number;
  avatarSeed: string;
  createdAt: string;
}

interface AdminTeamResult {
  id: string;
  name: string;
  slug: string;
  eventName: string;
  eventUrl: string;
  accessType: string;
  maxMembers: number;
  targetFaculty?: string;
  createdAt: string;
  owner?: {
    id: string;
    name: string;
    nim: string;
  };
}

export const AdminEntitySearch: React.FC = () => {
  const [entityType, setEntityType] = useState<"user" | "team">("user");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userResults, setUserResults] = useState<AdminUserResult[]>([]);
  const [teamResults, setTeamResults] = useState<AdminTeamResult[]>([]);
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setActionMessage(null);
    setHasSearched(true);

    const { data } = await fetchApi<{ data: any[] }>(
      `/api/admin/search?type=${entityType}&q=${encodeURIComponent(query.trim())}`,
    );

    setSearching(false);
    if (data) {
      if (entityType === "user") {
        setUserResults(data.data as AdminUserResult[]);
        setTeamResults([]);
      } else {
        setTeamResults(data.data as AdminTeamResult[]);
        setUserResults([]);
      }
    } else {
      setUserResults([]);
      setTeamResults([]);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    if (
      !confirm(
        `Are you sure you want to change this user's role to ${nextRole}?`,
      )
    )
      return;

    const { error } = await fetchApi(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: nextRole }),
    });

    if (error) {
      setActionMessage({ text: error, error: true });
    } else {
      setActionMessage({ text: `Role updated to ${nextRole}` });
      setUserResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: nextRole as any } : u,
        ),
      );
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete user "${userName}"? This cannot be undone.`,
      )
    )
      return;

    const { error } = await fetchApi(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });

    if (error) {
      setActionMessage({ text: error, error: true });
    } else {
      setActionMessage({ text: `User "${userName}" has been deleted.` });
      setUserResults((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete team "${teamName}"? This cannot be undone.`,
      )
    )
      return;

    const { error } = await fetchApi(`/api/admin/teams/${teamId}`, {
      method: "DELETE",
    });

    if (error) {
      setActionMessage({ text: error, error: true });
    } else {
      setActionMessage({ text: `Team "${teamName}" has been deleted.` });
      setTeamResults((prev) => prev.filter((t) => t.id !== teamId));
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Entity Lookup & Moderation
          </CardTitle>
          <CardDescription className="text-xs">
            Quickly search any student by name, NIM, or email, or inspect teams
            by title and event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="w-full sm:w-36 shrink-0">
              <Select
                value={entityType}
                onValueChange={(val: "user" | "team") => {
                  setEntityType(val);
                  setHasSearched(false);
                  setUserResults([]);
                  setTeamResults([]);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Students / Users</SelectItem>
                  <SelectItem value="team">Teams / Squads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  entityType === "user"
                    ? "Enter name, NIM, or email..."
                    : "Enter squad name, slug, or event..."
                }
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={searching || !query.trim()}
              className="h-9 text-xs shrink-0 w-full sm:w-auto"
            >
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>

          {actionMessage && (
            <div
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
                actionMessage.error
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
              }`}
            >
              {actionMessage.error ? (
                <AlertCircle className="size-3.5 shrink-0" />
              ) : (
                <Check className="size-3.5 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {searching ? (
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
          Searching records...
        </div>
      ) : hasSearched && entityType === "user" ? (
        userResults.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Found {userResults.length} matching student(s):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {userResults.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 rounded-full border border-border/60">
                      <AvatarImage
                        src={getDiceBearAvatar(u.avatarSeed)}
                        alt={u.name}
                      />
                      <AvatarFallback className="text-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {u.name}
                        </span>
                        <Badge
                          variant={u.role === "ADMIN" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {u.role}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {u.nim} · {u.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground flex-wrap">
                        <span>
                          {u.semester === 0 ? "Graduated" : `SM${u.semester}`}
                        </span>
                        <span>·</span>
                        <span>{getCampusBadge(u.campus)}</span>
                        <span>·</span>
                        <span>{getMajorCode(u.major)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRole(u.id, u.role)}
                      className="h-7 text-xs gap-1"
                    >
                      {u.role === "ADMIN" ? (
                        <>
                          <ShieldAlert className="size-3 text-amber-500" />
                          <span>Demote to User</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-3 text-emerald-500" />
                          <span>Make Admin</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="h-7 text-xs gap-1"
                    >
                      <Trash2 className="size-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
            No students found matching "{query}".
          </div>
        )
      ) : hasSearched && entityType === "team" ? (
        teamResults.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Found {teamResults.length} matching squad(s):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {teamResults.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {t.name}
                      </span>
                      <Badge
                        variant={
                          t.accessType === "CLOSED"
                            ? "destructive"
                            : t.accessType === "INVITE_ONLY"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {t.accessType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Event: {t.eventName}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Lead: {t.owner?.name || "Unknown"} ({t.owner?.nim || "-"})
                      · Max: {t.maxMembers}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTeam(t.id, t.name)}
                      className="h-7 text-xs gap-1"
                    >
                      <Trash2 className="size-3" />
                      <span>Delete Squad</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
            No squads found matching "{query}".
          </div>
        )
      ) : null}
    </div>
  );
};
