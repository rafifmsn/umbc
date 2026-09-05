import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";
import { Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const AdminSystemLinks: React.FC = () => {
  const [helpDocsUrl, setHelpDocsUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    const { data, error: err } = await fetchApi<{
      helpDocsUrl: string;
      supportEmail: string;
    }>("/api/admin/settings");

    if (data) {
      setHelpDocsUrl(data.helpDocsUrl || "");
      setSupportEmail(data.supportEmail || "");
    } else if (err) {
      setError(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    const { error: err } = await fetchApi("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        helpDocsUrl: helpDocsUrl.trim(),
        supportEmail: supportEmail.trim(),
      }),
    });

    setSaving(false);
    if (err) {
      setError(err);
      toast.error(err);
    } else {
      setSuccess(true);
      toast.success("Support links updated successfully!");
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">
          Platform Support & System Links
        </CardTitle>
        <CardDescription className="text-xs">
          Configure destination endpoints for student help and support links
          referenced across the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            {success && (
              <div className="flex items-center space-x-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                <Check className="size-4 shrink-0" />
                <span>System links updated successfully!</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="help-docs-url" className="text-xs font-medium">
                Help & Docs Link
              </Label>
              <Input
                id="help-docs-url"
                placeholder="e.g. mailto:connect@mercubuana.ac.id or https://..."
                value={helpDocsUrl}
                onChange={(e) => setHelpDocsUrl(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Referenced on the Home page and Sidebar
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="support-email" className="text-xs font-medium">
                Top Bar Support Link
              </Label>
              <Input
                id="support-email"
                placeholder="e.g. connect@mercubuana.ac.id or https://forms.gle/..."
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Destination link (mailto, external form, or URL) for the top bar
                support icon
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
