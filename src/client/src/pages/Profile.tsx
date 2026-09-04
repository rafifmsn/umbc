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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi, useAuth } from "@/lib/api";
import { MarkdownContent } from "@/components/markdown-content";
import {
  getDiceBearAvatar,
  getCampusBadge,
  getMajorCode,
} from "@/lib/constants";
import { Globe, FileText, MessageSquare, Edit, Users } from "lucide-react";
import {
  LinkedinIcon,
  GithubIcon,
  InstagramIcon,
  TwitterIcon,
} from "@/components/social-icons";

interface ProfileData {
  user: {
    id: string;
    nim: string;
    email: string;
    name: string;
    campus: string;
    faculty: string;
    major: string;
    degree: string;
    shift: string;
    semester: number;
    avatarSeed: string;
    headline?: string;
    bioMd?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
    resumeUrl?: string;
    createdAt: string;
  };
  teams: Array<{
    team: {
      id: string;
      name: string;
      slug: string;
      eventName: string;
    };
    role: string;
  }>;
}

export const Profile: React.FC = () => {
  const { nim } = useParams<{ nim: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [noteError, setNoteError] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    const res = await fetchApi<ProfileData>(`/api/users/${nim}`);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, [nim]);

  const isSelf = user?.nim === nim;

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !noteMessage.trim()) return;

    setNoteSending(true);
    setNoteError("");

    const { error: err } = await fetchApi("/api/notifications/note", {
      method: "POST",
      body: JSON.stringify({
        recipientId: data.user.id,
        message: noteMessage.trim(),
      }),
    });

    setNoteSending(false);
    if (err) {
      setNoteError(err);
    } else {
      setNoteMessage("");
      setNoteOpen(false);
    }
  };

  return (
    <AppShell
      title={data?.user.name || "Student Profile"}
      breadcrumbs={[
        { label: "Explore Peers", href: "/explore" },
        { label: data?.user.name || "Profile" },
      ]}
    >
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Loading student profile...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-destructive">{error}</div>
      ) : data ? (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Header Card */}
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center space-x-5">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage
                      src={getDiceBearAvatar(data.user.avatarSeed)}
                      alt={data.user.name}
                    />
                    <AvatarFallback>
                      {data.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      {data.user.name}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      NIM: {data.user.nim} · {data.user.email}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {data.user.semester === 0
                          ? "Graduated"
                          : `SM${data.user.semester}`}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {data.user.degree || "S1"}-
                        {getMajorCode(data.user.major)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getCampusBadge(data.user.campus)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {data.user.shift === "REGULER_1"
                          ? "Reguler 1"
                          : "Reguler 2"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {isSelf ? (
                    <Link to="/settings">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1.5"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Profile</span>
                      </Button>
                    </Link>
                  ) : (
                    user && (
                      <Button
                        size="sm"
                        onClick={() => setNoteOpen(true)}
                        className="flex items-center space-x-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Send Note</span>
                      </Button>
                    )
                  )}
                </div>
              </div>

              {data.user.headline && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">
                    {data.user.headline}
                  </p>
                </div>
              )}

              {/* Social Links */}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
                {data.user.linkedinUrl && (
                  <a
                    href={data.user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LinkedinIcon className="h-3.5 w-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}

                {data.user.githubUrl && (
                  <a
                    href={data.user.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <GithubIcon className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                  </a>
                )}

                {data.user.instagramUrl && (
                  <a
                    href={data.user.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <InstagramIcon className="h-3.5 w-3.5" />
                    <span>Instagram</span>
                  </a>
                )}

                {data.user.twitterUrl && (
                  <a
                    href={data.user.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <TwitterIcon className="h-3.5 w-3.5" />
                    <span>Twitter</span>
                  </a>
                )}

                {data.user.websiteUrl && (
                  <a
                    href={data.user.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Website</span>
                  </a>
                )}

                {data.user.resumeUrl && (
                  <a
                    href={data.user.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Resume</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Detailed background and technical interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.user.bioMd ? (
                <MarkdownContent content={data.user.bioMd} />
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No extended bio provided yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Joined Teams</span>
                </span>
                <Badge variant="outline">{data.teams.length}</Badge>
              </CardTitle>
              <CardDescription>
                Teams and projects this student is participating in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.teams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.teams.map(({ team, role }) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.slug}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 hover:border-primary/50 hover:bg-muted/60 transition-colors"
                    >
                      <div>
                        <span className="block text-sm font-semibold text-foreground hover:text-primary">
                          {team.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {team.eventName}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {role}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not part of any teams yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Note Dialog */}
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Note to {data.user.name}</DialogTitle>
                <DialogDescription>
                  This note will appear directly in their notification feed.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendNote}>
                {noteError && (
                  <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                    {noteError}
                  </div>
                )}

                <Textarea
                  placeholder="Hey, want to collaborate on..."
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  maxLength={280}
                  required
                  rows={4}
                />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {noteMessage.length}/280
                </p>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNoteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={noteSending}>
                    {noteSending ? "Sending..." : "Send Note"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </AppShell>
  );
};
