import { Settings } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "@/components/stats/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { translate as t } from "@/lib/i18n";
import { selectUser } from "@/services/redux/modules/user/selector";

import {
  PasswordCard,
  ProfileCard,
  SharingCard,
  SpotifyAccountsCard,
} from "./account";
import { InstanceCard, SpotifyAppCard, UsersCard } from "./admin";
import { ImportCard } from "./data";
import {
  AppearanceCard,
  ExcludedArtistsCard,
  LanguageCard,
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
  const available = TABS.filter((name) => name !== "admin" || user.admin);
  const current: Tab = available.includes(tab as Tab)
    ? (tab as Tab)
    : "account";

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        icon={<Settings />}
      />
      <Tabs
        value={current}
        onValueChange={(value) =>
          navigate(`/settings/${value}${window.location.search}`)
        }
        className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="account">{t("settings.tab.account")}</TabsTrigger>
          <TabsTrigger value="preferences">
            {t("settings.tab.preferences")}
          </TabsTrigger>
          <TabsTrigger value="data">{t("settings.tab.data")}</TabsTrigger>
          {user.admin && (
            <TabsTrigger value="admin">{t("settings.tab.admin")}</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="account" className="grid gap-4 xl:grid-cols-2">
          <SpotifyAccountsCard user={user} />
          <ProfileCard user={user} />
          <PasswordCard user={user} />
          <SharingCard user={user} />
        </TabsContent>
        <TabsContent value="preferences" className="grid gap-4 xl:grid-cols-2">
          <LanguageCard />
          <AppearanceCard />
          <StatsPreferencesCard user={user} />
          <ExcludedArtistsCard />
        </TabsContent>
        <TabsContent value="data" className="grid gap-4">
          <ImportCard />
        </TabsContent>
        {user.admin && (
          <TabsContent value="admin" className="grid gap-4 xl:grid-cols-2">
            <SpotifyAppCard />
            <UsersCard />
            <InstanceCard />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
