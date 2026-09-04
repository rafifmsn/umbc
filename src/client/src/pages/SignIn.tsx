import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: err } = await fetchApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          nim: nim.trim(),
          password,
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow">
            <GraduationCap className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            Sign In to UMBC
          </CardTitle>
          <CardDescription>
            Enter your student NIM and password to access your campus network
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
              <Label htmlFor="nim">NIM (Nomor Induk Mahasiswa)</Label>
              <Input
                id="nim"
                placeholder="41521010001"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/sign-up"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
