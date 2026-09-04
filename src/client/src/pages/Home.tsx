import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useSystemSettings } from "@/lib/api";

export const Home: React.FC = () => {
  const { helpDocsUrl } = useSystemSettings();

  return (
    <AppShell title="Home" breadcrumbs={[{ label: "Home" }]}>
      <div className="text-center max-w-lg mx-auto mt-8 lg:mt-16 px-4">
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight text-foreground text-balance">
          Welcome to Universitas Mercu Buana Connect
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          The collaborative network for UMB students to form competition squads,
          connect with peers across faculties and campuses, and showcase
          projects. Need assistance getting started?{" "}
          <a
            href={helpDocsUrl}
            target={helpDocsUrl.startsWith("http") ? "_blank" : undefined}
            rel={
              helpDocsUrl.startsWith("http") ? "noopener noreferrer" : undefined
            }
            className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
          >
            Help &amp; Docs
          </a>
        </p>
      </div>
    </AppShell>
  );
};

export default Home;
