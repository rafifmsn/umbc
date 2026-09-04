import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { CAMPUSES } from "@/lib/constants";
import { Send, Check, AlertCircle } from "lucide-react";

export const AdminBroadcast: React.FC = () => {
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [targetCampus, setTargetCampus] = useState("ALL");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastError, setBroadcastError] = useState("");

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setSendingBroadcast(true);
    setBroadcastSuccess(false);
    setBroadcastError("");

    const { error } = await fetchApi("/api/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        targetCampus: targetCampus === "ALL" ? undefined : targetCampus,
      }),
    });

    setSendingBroadcast(false);
    if (error) {
      setBroadcastError(error);
    } else {
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">
          Send Global Announcement
        </CardTitle>
        <CardDescription className="text-xs">
          Dispatch official announcements to student notification feeds across
          all campuses or targeted locations.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleBroadcast}>
        <CardContent className="space-y-4">
          {broadcastSuccess && (
            <div className="flex items-center space-x-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs text-emerald-500">
              <Check className="h-4 w-4 shrink-0" />
              <span>Broadcast announcement dispatched to student inboxes!</span>
            </div>
          )}

          {broadcastError && (
            <div className="flex items-center space-x-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{broadcastError}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Target Campus</Label>
            <div className="max-w-xs">
              <Select value={targetCampus} onValueChange={setTargetCampus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Target Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    All Campuses (Entire University)
                  </SelectItem>
                  {CAMPUSES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-title" className="text-xs font-semibold">
              Announcement Title
            </Label>
            <Input
              id="broadcast-title"
              placeholder="e.g. Gemastik & PKM 2026 Registration is Now Open!"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="broadcast-message"
              className="text-xs font-semibold"
            >
              Message Content
            </Label>
            <Textarea
              id="broadcast-message"
              placeholder="Provide event details, deadlines, and registration instructions for students..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={4}
              className="text-xs leading-relaxed"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={
                sendingBroadcast ||
                !broadcastTitle.trim() ||
                !broadcastMessage.trim()
              }
              className="gap-1.5 text-xs font-medium h-9"
            >
              <Send className="size-3.5" />
              <span>
                {sendingBroadcast ? "Dispatching..." : "Dispatch Broadcast"}
              </span>
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
};
