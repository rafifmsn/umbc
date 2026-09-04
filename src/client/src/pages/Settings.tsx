import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  CardFooter,
} from "@/components/ui/card";
import { fetchApi, useAuth } from "@/lib/api";
import {
  getDiceBearAvatar,
  CAMPUSES,
  SHIFTS,
  FACULTIES,
  SEMESTER_OPTIONS,
} from "@/lib/constants";
import { Dices, Check, AlertCircle } from "lucide-react";

export const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // Profile fields
  const [headline, setHeadline] = useState("");
  const [bioMd, setBioMd] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("");

  // Academic fields (all editable per user request)
  const [semester, setSemester] = useState<string>("1");
  const [campus, setCampus] = useState<string>("UMB_MY");
  const [shift, setShift] = useState<string>("REGULER_1");
  const [facultyId, setFacultyId] = useState<string>("FASILKOM");
  const [majorCode, setMajorCode] = useState<string>("TI");
  const [degree, setDegree] = useState<string>("S1");

  // Social fields
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setHeadline(user.headline || "");
      setBioMd(user.bioMd || "");

      // If avatarSeed is a custom URL, populate avatarUrl; otherwise set random/NIM seed and keep URL input blank
      if (
        user.avatarSeed &&
        (user.avatarSeed.startsWith("http://") ||
          user.avatarSeed.startsWith("https://"))
      ) {
        setAvatarUrl(user.avatarSeed);
        setAvatarSeed(user.nim);
      } else {
        setAvatarUrl("");
        setAvatarSeed(user.avatarSeed || user.nim);
      }

      setSemester(user.semester.toString());
      setCampus(user.campus || "UMB_MY");
      setShift(user.shift || "REGULER_1");
      setDegree(user.degree || "S1");

      // Match faculty by name or ID
      const matchedFac =
        FACULTIES.find(
          (f) => f.id === user.faculty || f.name === user.faculty,
        ) || FACULTIES[0];
      setFacultyId(matchedFac.id);

      // Match major by code or name
      const matchedMajor =
        matchedFac.majors.find(
          (m) => m.code === user.major || m.name === user.major,
        ) || matchedFac.majors[0];
      if (matchedMajor) {
        setMajorCode(matchedMajor.code);
      }

      setLinkedinUrl(user.linkedinUrl || "");
      setGithubUrl(user.githubUrl || "");
      setInstagramUrl(user.instagramUrl || "");
      setTwitterUrl(user.twitterUrl || "");
      setWebsiteUrl(user.websiteUrl || "");
      setResumeUrl(user.resumeUrl || "");
    }
  }, [user]);

  const currentFaculty =
    FACULTIES.find((f) => f.id === facultyId) || FACULTIES[0];

  const handleFacultyChange = (newFacId: string) => {
    setFacultyId(newFacId);
    const fac = FACULTIES.find((f) => f.id === newFacId);
    if (fac && fac.majors.length > 0) {
      setMajorCode(fac.majors[0].code);
    }
  };

  // Randomize identicon and clear custom URL input to eliminate confusion
  const randomizeSeed = () => {
    const randomStr = Math.random().toString(36).substring(2, 10);
    setAvatarSeed(randomStr);
    setAvatarUrl("");
  };

  // Compute live preview image source
  const previewAvatarSrc =
    avatarUrl.trim() &&
    (avatarUrl.trim().startsWith("http://") ||
      avatarUrl.trim().startsWith("https://"))
      ? avatarUrl.trim()
      : getDiceBearAvatar(avatarSeed || user?.nim || "default");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    // Determine final avatar to save: custom URL if entered, else avatarSeed
    const finalAvatarSeed = avatarUrl.trim()
      ? avatarUrl.trim()
      : avatarSeed || user?.nim || "default";

    const fac = FACULTIES.find((f) => f.id === facultyId);
    const maj = fac?.majors.find((m) => m.code === majorCode);

    const { data, error: err } = await fetchApi("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        headline: headline.trim(),
        bioMd: bioMd.trim(),
        avatarSeed: finalAvatarSeed,
        semester: Number(semester),
        campus,
        shift,
        faculty: fac?.name || facultyId,
        major: maj?.name || majorCode,
        degree,
        linkedinUrl: linkedinUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        twitterUrl: twitterUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        resumeUrl: resumeUrl.trim() || undefined,
      }),
    });

    setSaving(false);
    if (err) {
      setError(err);
    } else if (data?.user) {
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    }
  };

  return (
    <AppShell title="Account Settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Settings Header Block: Clean title & description without right-side NIM/campus display */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Account Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your student profile identity, academic enrollment status,
            and portfolio links
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-500">
            <Check className="size-4 shrink-0" />
            <span>Settings updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <Tabs defaultValue="profile" className="w-full space-y-6">
            {/* Clean shadcn Tabs without icons */}
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="social">Connections</TabsTrigger>
            </TabsList>

            {/* TAB 1: Profile & Identity */}
            <TabsContent value="profile" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Public Identity</CardTitle>
                  <CardDescription className="text-xs">
                    This is how other students will see you across the Explore
                    and Teams directories.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Avatar section: Image URL input with Randomize button */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl border border-border/50 bg-muted/20">
                    <Avatar className="size-16 rounded-full border-2 border-border shadow-sm shrink-0">
                      <AvatarImage
                        src={previewAvatarSrc}
                        alt="Avatar preview"
                      />
                      <AvatarFallback className="font-bold text-xs">
                        {(user?.name || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Label
                        htmlFor="avatar-url"
                        className="text-xs font-semibold"
                      >
                        Avatar Image URL
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Enter a direct link to your photo, or leave blank to use
                        the default identicon generated from your student NIM.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          id="avatar-url"
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://example.com/avatar.jpg (leave blank for default)"
                          className="text-xs max-w-md h-8"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={randomizeSeed}
                          className="gap-1.5 h-8 text-xs shrink-0"
                          title="Generate random identicon and clear URL input"
                        >
                          <Dices className="size-3.5" />
                          <span>Randomize</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Headline */}
                  <div className="space-y-2">
                    <Label htmlFor="headline" className="text-xs">
                      Headline
                    </Label>
                    <Input
                      id="headline"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. S1-TI Meruya | Fullstack Dev & Hackathon enthusiast"
                      maxLength={120}
                      className="text-xs"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Displayed on your explore preview card</span>
                      <span>{headline.length}/120</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-xs">
                      Extended Bio (Markdown)
                    </Label>
                    <Textarea
                      id="bio"
                      value={bioMd}
                      onChange={(e) => setBioMd(e.target.value)}
                      placeholder="Write about your technical background, skills, and projects you want to build..."
                      rows={6}
                      className="resize-none text-xs leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Markdown formatting is supported.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="font-semibold text-xs h-8"
                  >
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* TAB 2: Academic Status (All editable inputs, disabled NIM & Email with caption) */}
            <TabsContent value="academic" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Academic Enrollment & Status
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Update your current semester, study shift, faculty, and
                    campus. Credentials verified by the university registry are
                    locked.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Verified Credentials (Disabled Email & NIM with caption) */}
                  <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <h4 className="text-xs font-semibold text-foreground">
                      Registry Credentials
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="nim-disabled" className="text-xs">
                          Student NIM
                        </Label>
                        <Input
                          id="nim-disabled"
                          value={user?.nim || ""}
                          disabled
                          className="bg-muted/50 text-muted-foreground text-xs cursor-not-allowed h-8"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email-disabled" className="text-xs">
                          University Email
                        </Label>
                        <Input
                          id="email-disabled"
                          value={
                            user?.email ||
                            (user?.nim
                              ? `${user.nim}@student.mercubuana.ac.id`
                              : "")
                          }
                          disabled
                          className="bg-muted/50 text-muted-foreground text-xs cursor-not-allowed h-8"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground pt-1">
                      NIM and university student email are permanently verified
                      against the official academic registry and cannot be
                      edited.{" "}
                      <a
                        href="https://mercubuana.ac.id"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        Learn more
                      </a>
                    </p>
                  </div>

                  <Separator />

                  {/* Active Semester: 1-8 and Graduated (0) */}
                  <div className="space-y-2">
                    <Label className="text-xs">Active Semester</Label>
                    <div className="max-w-xs">
                      <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEMESTER_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value.toString()}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Editable Academic Details: Campus & Shift */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Campus Location</Label>
                      <Select value={campus} onValueChange={setCampus}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select campus" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMPUSES.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Study Shift</Label>
                      <Select value={shift} onValueChange={setShift}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIFTS.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Editable Faculty & Major & Degree */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Degree Program</Label>
                      <Select value={degree} onValueChange={setDegree}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select degree" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="S1">S1 (Strata 1)</SelectItem>
                          <SelectItem value="D3">D3 (Diploma 3)</SelectItem>
                          <SelectItem value="S2">S2 (Magister)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Faculty</Label>
                      <Select
                        value={facultyId}
                        onValueChange={handleFacultyChange}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select faculty" />
                        </SelectTrigger>
                        <SelectContent>
                          {FACULTIES.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Program / Major</Label>
                      <Select value={majorCode} onValueChange={setMajorCode}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select major" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentFaculty.majors.map((m) => (
                            <SelectItem key={m.code} value={m.code}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="font-semibold text-xs h-8"
                  >
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* TAB 3: Social & Portfolio */}
            <TabsContent value="social" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Social & Professional Links
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Provide links to your GitHub, LinkedIn, and portfolios so
                    teammates can reach out to you directly.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="linkedin" className="text-xs">
                        LinkedIn URL
                      </Label>
                      <Input
                        id="linkedin"
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="github" className="text-xs">
                        GitHub URL
                      </Label>
                      <Input
                        id="github"
                        type="url"
                        placeholder="https://github.com/username"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="instagram" className="text-xs">
                        Instagram URL
                      </Label>
                      <Input
                        id="instagram"
                        type="url"
                        placeholder="https://instagram.com/username"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="twitter" className="text-xs">
                        Twitter / X URL
                      </Label>
                      <Input
                        id="twitter"
                        type="url"
                        placeholder="https://x.com/username"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="website" className="text-xs">
                        Portfolio / Website URL
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://mywebsite.dev"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="resume" className="text-xs">
                        Resume / CV URL
                      </Label>
                      <Input
                        id="resume"
                        type="url"
                        placeholder="https://drive.google.com/your-cv"
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="font-semibold text-xs h-8"
                  >
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </AppShell>
  );
};

export default Settings;
