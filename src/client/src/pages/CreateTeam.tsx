import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/date-range-picker";
import { fetchApi } from "@/lib/api";
import { FACULTIES } from "@/lib/constants";
import { ImageIcon } from "lucide-react";

export const CreateTeam: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accessType, setAccessType] = useState<string>("OPEN");
  const [maxMembers, setMaxMembers] = useState<string>("5");
  const [targetFaculty, setTargetFaculty] = useState<string>("ALL");
  const [initialMembers, setInitialMembers] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleNameInput = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !slug.trim() ||
      !eventName.trim() ||
      !eventUrl.trim() ||
      !contentMd.trim()
    ) {
      setError("Please fill out all required fields (*)");
      return;
    }

    setSaving(true);

    const validMembers = initialMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const { data, error: err } = await fetchApi("/api/teams", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
        coverImageUrl: coverImageUrl.trim() || undefined,
        eventName: eventName.trim(),
        eventUrl: eventUrl.trim(),
        contentMd: contentMd.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accessType,
        maxMembers: parseInt(maxMembers, 10) || 5,
        targetFaculty: targetFaculty !== "ALL" ? targetFaculty : undefined,
        memberNims: validMembers,
      }),
    });

    setSaving(false);

    if (err) {
      setError(err);
      return;
    }

    if (data?.team) {
      navigate(`/teams/${data.team.slug}`);
    }
  };

  return (
    <AppShell
      title="Create Squad"
      breadcrumbs={[
        { label: "Teams & Projects", href: "/teams" },
        { label: "Create Squad" },
      ]}
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Create Squad Team
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up your hackathon roster, event details, and member slots
            </p>
          </div>

          {/* Top-right action buttons: hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-2">
            <Link to="/teams">
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={(e) => handleSubmit(e as any)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Team"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Team Details */}
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
              <CardDescription>
                Provide project metadata and event information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Name of your team*</Label>
                <Input
                  id="team-name"
                  placeholder="e.g. Fasilkom Hackathon Squad"
                  value={name}
                  onChange={(e) => handleNameInput(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-slug">Slug*</Label>
                <Input
                  id="team-slug"
                  placeholder="fasilkom-hackathon-squad"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Your team invite link will be:{" "}
                  <span className="text-foreground">
                    umbc.my.id/teams/{slug || "[slug]"}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-name">Event Name*</Label>
                  <Input
                    id="event-name"
                    placeholder="e.g. Hackfest Indonesia 2026"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event-url">Event URL*</Label>
                  <Input
                    id="event-url"
                    type="url"
                    placeholder="https://hackfest.id"
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Recruitment Status</Label>
                  <Select value={accessType} onValueChange={setAccessType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open for public</SelectItem>
                      <SelectItem value="INVITE_ONLY">Invite only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Member Limit</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    placeholder="5"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Faculty</Label>
                  <Select
                    value={targetFaculty}
                    onValueChange={setTargetFaculty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Faculties" />
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

              {/* Event Dates with shadcn DateRangePicker */}
              <div className="space-y-2">
                <Label>Event Dates (Optional)</Label>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start || "");
                    setEndDate(end || "");
                  }}
                  placeholder="Select event start and deadline dates"
                />
                <p className="text-[11px] text-muted-foreground">
                  Past deadline will automatically close squad recruitment
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-md">
                  Content Description (Markdown)*
                </Label>
                <Textarea
                  id="content-md"
                  placeholder="Describe what your team is building, required skills, schedule..."
                  rows={6}
                  value={contentMd}
                  onChange={(e) => setContentMd(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-members">
                  Add initial team members (NIM)
                </Label>
                <Input
                  id="initial-members"
                  placeholder="e.g. 41521010001, 41521010002"
                  value={initialMembers}
                  onChange={(e) => setInitialMembers(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Separate multiple student NIMs with commas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Cover Image (stacked below Team Details) */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Image (Optional)</CardTitle>
              <CardDescription>
                Visual background for your team banner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {coverImageUrl.trim() ? (
                  <>
                    <img
                      src={coverImageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">
                      (preview image placeholder)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover-url">Image URL</Label>
                <Input
                  id="cover-url"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Masked with dark vertical gradient
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bottom actions: always visible, aligned right */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Link to="/teams">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Team"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};
