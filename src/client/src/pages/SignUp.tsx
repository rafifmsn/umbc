import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { GraduationCap } from "lucide-react";
import { fetchApi, useAuth } from "@/lib/api";
import { CAMPUSES, FACULTIES, SHIFTS } from "@/lib/constants";

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [campus, setCampus] = useState<string>("UMB_MY");
  const [facultyId, setFacultyId] = useState<string>("FASILKOM");
  const [majorCode, setMajorCode] = useState<string>("TI");
  const [shift, setShift] = useState<string>("REGULER_1");
  const [semester, setSemester] = useState<string>("1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentFaculty =
    FACULTIES.find((f) => f.id === facultyId) || FACULTIES[0];

  const handleFacultyChange = (id: string) => {
    setFacultyId(id);
    const faculty = FACULTIES.find((f) => f.id === id);
    if (faculty && faculty.majors.length > 0) {
      setMajorCode(faculty.majors[0].code);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !nim.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Please provide all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data, error: err } = await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          nim: nim.trim(),
          password,
          campus,
          faculty: currentFaculty.id,
          major: majorCode,
          degree: "S1",
          shift,
          semester: Number(semester),
          avatarSeed: nim.trim() || Math.random().toString(),
          disclaimerAccepted: true,
        }),
      });

      if (err) {
        setError(err);
        return;
      }

      if (data?.user) {
        await refreshUser();
        navigate("/explore");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg border-border bg-card shadow-xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow">
            <GraduationCap className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Create an account
          </CardTitle>
          <CardDescription>
            Join your university peers across all Mercu Buana campuses
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Rafif Muchsin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nim">NIM (Nomor Induk Mahasiswa)</Label>
              <Input
                id="nim"
                placeholder="41521010001"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Campus Location</Label>
                <Select value={campus} onValueChange={setCampus}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Shift</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Faculty</Label>
                <Select value={facultyId} onValueChange={handleFacultyChange}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Program / Major</Label>
                <Select value={majorCode} onValueChange={setMajorCode}>
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Current Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={s.toString()}>
                      Semester {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="0">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Complete Registration"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground leading-relaxed px-2">
              By creating an account, you agree to our Terms of Service and
              acknowledge the university student policy regarding NIM usage and
              anti-impersonation rules.
            </p>

            <p className="text-center text-xs text-muted-foreground">
              Already registered?{" "}
              <Link
                to="/sign-in"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
