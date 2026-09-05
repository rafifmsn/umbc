import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { fetchApi, useAuth } from "@/lib/api";
import { getDiceBearAvatar, getCampusBadge } from "@/lib/constants";
import { MarkdownContent } from "@/components/markdown-content";
import { ExternalLink, Calendar, Users, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface TeamDetailData {
  team: {
    id: string;
    name: string;
    slug: string;
    coverImageUrl?: string;
    eventName: string;
    eventUrl: string;
    contentMd: string;
    startDate?: string;
    endDate?: string;
    accessType?: "OPEN" | "INVITE_ONLY" | "CLOSED";
    maxMembers?: number;
    targetFaculty?: string;
    ownerId: string;
  };
  members: Array<{
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      nim: string;
      campus: string;
      major: string;
      degree: string;
      semester: number;
      avatarSeed: string;
    };
  }>;
}

export const TeamDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<TeamDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    const res = await fetchApi<TeamDetailData>(`/api/teams/${slug}`);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTeam();
  }, [slug]);

  const isOwner = user?.id === data?.team.ownerId;
  const isMember = Boolean(
    user && data?.members.some((m) => m.user.id === user.id),
  );
  const isFull = (data?.members.length || 0) >= (data?.team.maxMembers || 5);
  const canJoin = Boolean(
    user && !isMember && data?.team.accessType === "OPEN" && !isFull,
  );

  const handleJoinTeam = async () => {
    if (!data) return;
    setJoining(true);
    const res = await fetchApi(`/api/teams/${data.team.id}/join`, {
      method: "POST",
    });
    setJoining(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Joined squad successfully!");
      loadTeam();
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    await fetchApi(`/api/teams/${data!.team.id}/members/${userId}`, {
      method: "DELETE",
    });
    toast.success("Member removed from squad");
    loadTeam();
  };

  return (
    <AppShell
      title={data?.team.name || "Team"}
      breadcrumbs={[
        { label: "Teams & Projects", href: "/teams" },
        { label: data?.team.name || "Team Detail" },
      ]}
    >
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading team...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-destructive">{error}</div>
      ) : data ? (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Header Cover Banner */}
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950">
            {data.team.coverImageUrl && (
              <img
                src={data.team.coverImageUrl}
                alt=""
                aria-hidden="true"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {data.team.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canJoin && (
                  <Button
                    size="sm"
                    onClick={handleJoinTeam}
                    disabled={joining}
                    className="gap-1.5 font-medium shadow-sm"
                  >
                    <UserPlus className="size-4" />
                    <span>{joining ? "Joining..." : "Join Team"}</span>
                  </Button>
                )}

                <div className="flex items-center space-x-1.5 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs text-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {data.members.length} / {data.team.maxMembers || 5} Members
                  </span>
                </div>

                {(data.team.startDate || data.team.endDate) && (
                  <div className="flex items-center space-x-1.5 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs text-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {data.team.startDate
                        ? new Date(data.team.startDate).toLocaleDateString()
                        : ""}
                      {data.team.endDate
                        ? ` - ${new Date(data.team.endDate).toLocaleDateString()}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* About Team */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About this Team</CardTitle>
                  <CardDescription>
                    Project overview, requirements, and mission statement
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  <MarkdownContent content={data.team.contentMd} />
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Event Info & Team Members */}
            <div className="space-y-4">
              {/* Event Details Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Event Details
                    </span>
                    {data.team.accessType === "CLOSED" ? (
                      <Badge variant="destructive" className="text-[11px]">
                        Closed
                      </Badge>
                    ) : data.team.accessType === "INVITE_ONLY" ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] border-amber-500/50 text-amber-400"
                      >
                        Invite Only
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] border-emerald-500/50 text-emerald-400"
                      >
                        Open for Public
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold pt-1">
                    {data.team.eventName}
                  </CardTitle>
                  {data.team.targetFaculty && (
                    <CardDescription className="text-xs">
                      Target Faculty: {data.team.targetFaculty}
                    </CardDescription>
                  )}
                </CardHeader>
                {data.team.eventUrl && (
                  <CardContent className="pt-0">
                    <a
                      href={data.team.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      <span>Visit Event Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardContent>
                )}
              </Card>

              {/* Official Team Members Block */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Team Members</span>
                    <Badge variant="outline">{data.members.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Students collaborating on this project
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {data.members.map((m) => (
                    <div
                      key={m.user.id}
                      className="flex items-center justify-between space-x-3"
                    >
                      <Link
                        to={`/profile/${m.user.nim}`}
                        className="flex items-center space-x-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={getDiceBearAvatar(m.user.avatarSeed)}
                            alt={m.user.name}
                          />
                          <AvatarFallback>
                            {m.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {m.user.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            SM{m.user.semester} ·{" "}
                            {getCampusBadge(m.user.campus)}
                          </p>
                        </div>
                      </Link>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <Badge
                          variant={
                            m.user.id === data.team.ownerId
                              ? "default"
                              : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {m.user.id === data.team.ownerId ? "Owner" : m.role}
                        </Badge>

                        {((isOwner && m.user.id !== data.team.ownerId) ||
                          (!isOwner && m.user.id === user?.id)) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(m.user.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Remove from team"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};
