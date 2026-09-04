import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { fetchApi, useAuth } from "@/lib/api";
import { getDiceBearAvatar, FACULTIES } from "@/lib/constants";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  Users,
  FolderGit2,
  ExternalLink,
  Edit,
  UserPlus,
  Trash2,
  LogOut,
  Calendar,
  AlertCircle,
  Plus,
} from "lucide-react";

interface TeamMemberItem {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    nim: string;
    avatarSeed: string;
  };
}

interface MyTeamItem {
  id: string;
  name: string;
  slug: string;
  coverImageUrl?: string;
  eventName: string;
  eventUrl: string;
  contentMd: string;
  startDate?: string;
  endDate?: string;
  accessType: "OPEN" | "INVITE_ONLY" | "CLOSED";
  maxMembers: number;
  targetFaculty?: string;
  ownerId: string;
  myRole: "Owner" | "Member" | string;
  memberCount: number;
  members: TeamMemberItem[];
}

export const MyTeams: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<MyTeamItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Team Dialog State
  const [editingTeam, setEditingTeam] = useState<MyTeamItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEventName, setEditEventName] = useState("");
  const [editEventUrl, setEditEventUrl] = useState("");
  const [editContentMd, setEditContentMd] = useState("");
  const [editAccessType, setEditAccessType] = useState<string>("OPEN");
  const [editMaxMembers, setEditMaxMembers] = useState<string>("5");
  const [editTargetFaculty, setEditTargetFaculty] = useState<string>("ALL");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editCoverImageUrl, setEditCoverImageUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingTeam, setDeletingTeam] = useState(false);

  // Manage Members Dialog State
  const [managingTeam, setManagingTeam] = useState<MyTeamItem | null>(null);
  const [newMemberNim, setNewMemberNim] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  const loadMyTeams = async () => {
    setLoading(true);
    const { data } = await fetchApi<{ data: MyTeamItem[] }>("/api/teams/my");
    if (data) {
      setTeams(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMyTeams();
  }, []);

  const handleDeleteTeam = async () => {
    if (!editingTeam) return;
    if (
      !confirm(
        `Are you sure you want to delete "${editingTeam.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingTeam(true);
    const { error: err } = await fetchApi(`/api/teams/${editingTeam.id}`, {
      method: "DELETE",
    });
    setDeletingTeam(false);

    if (err) {
      setEditError(err);
    } else {
      setEditingTeam(null);
      loadMyTeams();
    }
  };

  const handleLeaveTeam = async (team: MyTeamItem) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to leave "${team.name}"?`)) return;

    await fetchApi(`/api/teams/${team.id}/members/${user.id}`, {
      method: "DELETE",
    });
    loadMyTeams();
  };

  const openEditModal = (team: MyTeamItem) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditEventName(team.eventName);
    setEditEventUrl(team.eventUrl);
    setEditContentMd(team.contentMd);
    setEditAccessType(team.accessType || "OPEN");
    setEditMaxMembers(String(team.maxMembers || 5));
    setEditTargetFaculty(team.targetFaculty || "ALL");
    setEditStartDate(team.startDate ? team.startDate.split("T")[0] : "");
    setEditEndDate(team.endDate ? team.endDate.split("T")[0] : "");
    setEditCoverImageUrl(team.coverImageUrl || "");
    setEditError("");
  };

  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    setSavingEdit(true);
    setEditError("");

    const { error: err } = await fetchApi(`/api/teams/${editingTeam.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: editName.trim(),
        eventName: editEventName.trim(),
        eventUrl: editEventUrl.trim(),
        contentMd: editContentMd.trim(),
        accessType: editAccessType,
        maxMembers: parseInt(editMaxMembers, 10) || 5,
        targetFaculty: editTargetFaculty !== "ALL" ? editTargetFaculty : null,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
        coverImageUrl: editCoverImageUrl.trim() || null,
      }),
    });

    setSavingEdit(false);
    if (err) {
      setEditError(err);
    } else {
      setEditingTeam(null);
      loadMyTeams();
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingTeam || !newMemberNim.trim()) return;

    setAddingMember(true);
    setMemberError("");

    const { error: err } = await fetchApi(
      `/api/teams/${managingTeam.id}/members`,
      {
        method: "POST",
        body: JSON.stringify({
          nim: newMemberNim.trim(),
          role: "Member",
        }),
      },
    );

    setAddingMember(false);
    if (err) {
      setMemberError(err);
    } else {
      setNewMemberNim("");
      const { data } = await fetchApi<{ data: MyTeamItem[] }>("/api/teams/my");
      if (data) {
        setTeams(data.data);
        const updated = data.data.find((t) => t.id === managingTeam.id);
        if (updated) setManagingTeam(updated);
      }
    }
  };

  const handleRemoveMember = async (teamId: string, memberUserId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    await fetchApi(`/api/teams/${teamId}/members/${memberUserId}`, {
      method: "DELETE",
    });

    const { data } = await fetchApi<{ data: MyTeamItem[] }>("/api/teams/my");
    if (data) {
      setTeams(data.data);
      if (managingTeam) {
        const updated = data.data.find((t) => t.id === managingTeam.id);
        if (updated) setManagingTeam(updated);
      }
    }
  };

  return (
    <AppShell
      title="My Teams"
      breadcrumbs={[
        { label: "Teams & Projects", href: "/teams" },
        { label: "My Teams" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              My Teams
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your joined squads, project rosters, and member
              participation
            </p>
          </div>

          <Link to="/teams/create">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="size-4" />
              <span>Create Team</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl border border-border/50 bg-card/40 animate-pulse"
              />
            ))}
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => {
              const isOwner = t.ownerId === user?.id;
              const isAdmin = user?.role === "ADMIN";
              const canManage = isOwner || isAdmin;

              return (
                <Card
                  key={t.id}
                  className="flex flex-col justify-between overflow-hidden border-border/60 hover:border-primary/50 transition-all shadow-sm"
                >
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-base font-bold truncate">
                      {t.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      Event: {t.eventName}
                    </CardDescription>

                    <div className="flex items-center gap-2 pt-2">
                      <Badge
                        variant={isOwner ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {t.myRole}
                      </Badge>

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
                        {t.accessType === "CLOSED"
                          ? "Closed"
                          : t.accessType === "INVITE_ONLY"
                            ? "Invite Only"
                            : "Open"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        <span>
                          {t.memberCount} / {t.maxMembers} Members
                        </span>
                      </div>

                      {t.targetFaculty && (
                        <span className="text-[11px]">{t.targetFaculty}</span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 bg-muted/20 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/teams/${t.slug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                      >
                        <ExternalLink className="size-3" />
                        <span>Details</span>
                      </Button>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      {canManage ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManagingTeam(t)}
                            className="h-8 text-xs gap-1"
                            title="Manage Roster"
                          >
                            <Users className="size-3" />
                            <span>Members</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(t)}
                            className="h-8 text-xs gap-1"
                            title="Edit Team"
                          >
                            <Edit className="size-3" />
                            <span>Edit</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLeaveTeam(t)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                        >
                          <LogOut className="size-3" />
                          <span>Leave</span>
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
            <FolderGit2 className="size-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              You haven't joined or created any squads yet.
            </p>
            <Link to="/teams" className="block">
              <Button size="sm" variant="outline">
                Browse Active Teams
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Edit Team Dialog */}
      <Dialog
        open={Boolean(editingTeam)}
        onOpenChange={(open) => !open && setEditingTeam(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Squad: {editingTeam?.name}</DialogTitle>
            <DialogDescription>
              Update event information, recruitment status, or member capacity.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
              {editError}
            </div>
          )}

          <form onSubmit={handleSaveTeamEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-event-name">Event Name</Label>
                <Input
                  id="edit-event-name"
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-event-url">Event URL</Label>
                <Input
                  id="edit-event-url"
                  type="url"
                  value={editEventUrl}
                  onChange={(e) => setEditEventUrl(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editAccessType}
                  onValueChange={setEditAccessType}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open for Public</SelectItem>
                    <SelectItem value="INVITE_ONLY">Invite Only</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Member Limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={editMaxMembers}
                  onChange={(e) => setEditMaxMembers(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label>Faculty</Label>
                <Select
                  value={editTargetFaculty}
                  onValueChange={setEditTargetFaculty}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Faculties</SelectItem>
                    {FACULTIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Event Dates (Optional)</Label>
              <DateRangePicker
                startDate={editStartDate}
                endDate={editEndDate}
                onChange={(start, end) => {
                  setEditStartDate(start || "");
                  setEditEndDate(end || "");
                }}
                placeholder="Select event start and deadline dates"
              />
              <p className="text-[11px] text-muted-foreground">
                Past deadline will automatically close squad recruitment
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cover-image">
                Cover Image URL (Optional)
              </Label>
              <Input
                id="edit-cover-image"
                type="url"
                placeholder="https://images.unsplash.com/... (leave blank for default)"
                value={editCoverImageUrl}
                onChange={(e) => setEditCoverImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Description</Label>
              <Textarea
                id="edit-content"
                value={editContentMd}
                onChange={(e) => setEditContentMd(e.target.value)}
                rows={4}
                required
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteTeam}
                disabled={deletingTeam || savingEdit}
                className="gap-1.5 w-full sm:w-auto"
              >
                <Trash2 className="size-3.5" />
                <span>{deletingTeam ? "Deleting..." : "Delete Team"}</span>
              </Button>

              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTeam(null)}
                  className="flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingEdit || deletingTeam}
                  className="flex-1 sm:flex-initial"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog
        open={Boolean(managingTeam)}
        onOpenChange={(open) => !open && setManagingTeam(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Roster: {managingTeam?.name}</DialogTitle>
            <DialogDescription>
              Add or remove members participating in this team.
            </DialogDescription>
          </DialogHeader>

          {memberError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
              {memberError}
            </div>
          )}

          {/* Add member input */}
          <form
            onSubmit={handleAddMember}
            className="flex items-center gap-2 pt-2"
          >
            <Input
              placeholder="Enter student NIM (e.g. 41521010001)"
              value={newMemberNim}
              onChange={(e) => setNewMemberNim(e.target.value)}
              className="h-9 text-xs"
              required
            />
            <Button
              type="submit"
              size="sm"
              disabled={addingMember}
              className="gap-1.5 shrink-0"
            >
              <UserPlus className="size-3.5" />
              <span>{addingMember ? "Adding..." : "Add Member"}</span>
            </Button>
          </form>

          {/* Current roster list */}
          <div className="space-y-2 pt-3 max-h-60 overflow-y-auto divide-y divide-border/40">
            {managingTeam?.members && managingTeam.members.length > 0 ? (
              managingTeam.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8 rounded-full border border-border/50">
                      <AvatarImage
                        src={getDiceBearAvatar(m.user.avatarSeed)}
                        alt={m.user.name}
                      />
                      <AvatarFallback className="text-[10px]">
                        {m.user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <span className="block text-xs font-semibold text-foreground">
                        {m.user.name}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {m.user.nim} · {m.role}
                      </span>
                    </div>
                  </div>

                  {m.role !== "Owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleRemoveMember(managingTeam.id, m.user.id)
                      }
                      className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Remove Member"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No members found.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManagingTeam(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};
