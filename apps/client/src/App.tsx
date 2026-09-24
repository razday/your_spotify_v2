import { QueryClientProvider } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Bootstrap } from "@/components/app/bootstrap";
import { RequireAuth } from "@/components/app/require-auth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/i18n";
import { queryClient } from "@/lib/queries";
import AchievementsPage from "@/pages/achievements";
import AffinityPage from "@/pages/affinity";
import LoginPage from "@/pages/auth/login";
import LogoutPage from "@/pages/auth/logout";
import RegisterPage from "@/pages/auth/register";
import { AlbumPage, ArtistPage, TrackPage } from "@/pages/details";
import DiscoveriesPage from "@/pages/discoveries";
import FriendsPage from "@/pages/friends";
import HabitsPage from "@/pages/habits";
import HistoryPage from "@/pages/history";
import LibraryPage from "@/pages/library";
import { ApiEndpointErrorPage, NotFoundPage } from "@/pages/misc";
import OverviewPage from "@/pages/overview";
import PlaylistPage from "@/pages/playlist";
import PlaylistsPage from "@/pages/playlists";
import RecapPage from "@/pages/recap";
import SessionsPage from "@/pages/sessions";
import SettingsPage from "@/pages/settings";
import TastePage from "@/pages/taste";
import { TopAlbumsPage, TopArtistsPage, TopTracksPage } from "@/pages/tops";
import { selectAffinityEnabled } from "@/services/redux/modules/settings/selector";

export default function App() {
  const affinityEnabled = useSelector(selectAffinityEnabled);
  const language = useLanguage();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <Bootstrap />
          {/* Remounted when the language changes, so every text follows */}
          <Routes key={language}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/oauth/spotify" element={<ApiEndpointErrorPage />} />
            <Route
              path="/registrations-disabled"
              element={<Navigate to="/register" replace />}
            />
            <Route element={<RequireAuth />}>
              <Route index element={<OverviewPage />} />
              <Route path="/recap" element={<RecapPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/top/tracks" element={<TopTracksPage />} />
              <Route
                path="/top/songs"
                element={<Navigate to="/top/tracks" replace />}
              />
              <Route path="/top/artists" element={<TopArtistsPage />} />
              <Route path="/top/albums" element={<TopAlbumsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/taste" element={<TastePage />} />
              <Route path="/discoveries" element={<DiscoveriesPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route
                path="/playlists/:accountId/:id"
                element={<PlaylistPage />}
              />
              <Route path="/artist/:id" element={<ArtistPage />} />
              <Route path="/album/:id" element={<AlbumPage />} />
              <Route path="/track/:id" element={<TrackPage />} />
              <Route path="/song/:id" element={<TrackPage />} />
              {affinityEnabled && (
                <Route path="/affinity" element={<AffinityPage />} />
              )}
              {affinityEnabled && (
                <Route path="/friends" element={<FriendsPage />} />
              )}
              <Route path="/settings/:tab?" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          <Toaster position="bottom-right" richColors closeButton />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
