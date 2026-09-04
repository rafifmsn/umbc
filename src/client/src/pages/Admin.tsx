import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminEntitySearch } from "@/components/admin/AdminEntitySearch";
import { AdminBroadcast } from "@/components/admin/AdminBroadcast";
import { AdminSystemLinks } from "@/components/admin/AdminSystemLinks";

export const Admin: React.FC = () => {
  return (
    <AppShell title="Admin Console" breadcrumbs={[{ label: "Admin Console" }]}>
      <div className="space-y-6 max-w-5xl mx-auto pb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Moderation &amp; Administration
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search and moderate student accounts and squads, dispatch global announcements, and inspect system links.
          </p>
        </div>

        <Tabs defaultValue="search" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="search">Entity Lookup</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="links">System Links</TabsTrigger>
          </TabsList>

          {/* TAB 1: User & Team Search and Moderation */}
          <TabsContent value="search" className="space-y-6 mt-0">
            <AdminEntitySearch />
          </TabsContent>

          {/* TAB 2: Global System Broadcast */}
          <TabsContent value="broadcast" className="space-y-6 mt-0">
            <AdminBroadcast />
          </TabsContent>

          {/* TAB 3: Reference Support & Docs Links */}
          <TabsContent value="links" className="space-y-6 mt-0">
            <AdminSystemLinks />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default Admin;
