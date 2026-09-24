import { Settings } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components/stats/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectUser } from "@/services/redux/modules/user/selector";

import { PasswordCard, ProfileCard, SharingCard, SpotifyCard } from "./account";
import { InstanceCard, UsersCard } from "./admin";
import { ImportCard } from "./data";
import {
  AppearanceCard,
  ExcludedArtistsCard,
  StatsPreferencesCard,
} from "./preferences";

const TABS = ["account", "preferences", "data", "admin"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const user = useSelector(selectUser);
  const { tab } = useParams();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }
  const available = TABS.filter((t) => t !== "admin" || user.admin);
  const current: Tab = available.includes(tab as Tab)
    ? (tab as Tab)
    : "account";

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, preferences and data"
        icon={<Settings />}
      />
      <Tabs
        value={current}
        onValueChange={(value) =>
          navigate(`/settings/${value}${window.location.search}`)
        }
        className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          {user.admin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>
        <TabsContent value="account" className="grid gap-4 xl:grid-cols-2">
          <ProfileCard user={user} />
          <SpotifyCard user={user} />
          <PasswordCard user={user} />
          <SharingCard user={user} />
        </TabsContent>
        <TabsContent value="preferences" className="grid gap-4 xl:grid-cols-2">
          <AppearanceCard />
          <StatsPreferencesCard user={user} />
          <ExcludedArtistsCard />
        </TabsContent>
        <TabsContent value="data" className="grid gap-4">
          <ImportCard />
        </TabsContent>
        {user.admin && (
          <TabsContent value="admin" className="grid gap-4 xl:grid-cols-2">
            <UsersCard />
            <InstanceCard />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
