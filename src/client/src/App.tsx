import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { AuthProvider } from "@/lib/api";

import { Home } from "@/pages/Home";
import { SignIn } from "@/pages/SignIn";
import { SignUp } from "@/pages/SignUp";
import { Explore } from "@/pages/Explore";
import { Teams } from "@/pages/Teams";
import { MyTeams } from "@/pages/MyTeams";
import { CreateTeam } from "@/pages/CreateTeam";
import { TeamDetail } from "@/pages/TeamDetail";
import { Profile } from "@/pages/Profile";
import { Settings } from "@/pages/Settings";
import { Admin } from "@/pages/Admin";
import { Toaster } from "@/components/ui/sonner";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" closeButton />
      <BrowserRouter>
        <NuqsAdapter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/my" element={<MyTeams />} />
            <Route path="/teams/create" element={<CreateTeam />} />
            <Route path="/teams/:slug" element={<TeamDetail />} />
            <Route path="/profile/:nim" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NuqsAdapter>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
