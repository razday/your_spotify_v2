import {
  ArrowUpCircle,
  AudioLines,
  Award,
  CalendarClock,
  ChevronsUpDown,
  Disc3,
  Gauge,
  History,
  Hourglass,
  LogOut,
  MicVocal,
  Music2,
  Palette,
  Settings,
  Sparkles,
  Telescope,
  Trophy,
  Users,
} from "lucide-react";
import { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { formatTimeAgo, initials } from "@/lib/format";
import { MessageKey, useT } from "@/lib/i18n";
import { usePeriodSearch } from "@/lib/period";
import {
  selectAffinityEnabled,
  selectUpdateAvailable,
  selectVersion,
} from "@/services/redux/modules/settings/selector";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";

interface NavItem {
  title: MessageKey;
  url: string;
  icon: ReactNode;
}

interface NavGroup {
  label: MessageKey;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "nav.dashboard",
    items: [
      { title: "nav.overview", url: "/", icon: <Gauge /> },
      { title: "nav.recap", url: "/recap", icon: <Sparkles /> },
      { title: "nav.achievements", url: "/achievements", icon: <Award /> },
    ],
  },
  {
    label: "nav.tops",
    items: [
      { title: "nav.topTracks", url: "/top/tracks", icon: <Music2 /> },
      { title: "nav.topArtists", url: "/top/artists", icon: <MicVocal /> },
      { title: "nav.topAlbums", url: "/top/albums", icon: <Disc3 /> },
    ],
  },
  {
    label: "nav.explore",
    items: [
      { title: "nav.history", url: "/history", icon: <History /> },
      { title: "nav.habits", url: "/habits", icon: <CalendarClock /> },
      { title: "nav.taste", url: "/taste", icon: <Palette /> },
      { title: "nav.discoveries", url: "/discoveries", icon: <Telescope /> },
      { title: "nav.sessions", url: "/sessions", icon: <Hourglass /> },
    ],
  },
];

const socialGroup: NavGroup = {
  label: "nav.social",
  items: [
    { title: "nav.friends", url: "/friends", icon: <Trophy /> },
    { title: "nav.affinity", url: "/affinity", icon: <Users /> },
  ],
};

function isActive(pathname: string, url: string) {
  return url === "/" ? pathname === "/" : pathname.startsWith(url);
}

export function AppSidebar() {
  const t = useT();
  const { pathname } = useLocation();
  const periodSearch = usePeriodSearch();
  const user = useSelector(selectUser);
  const isPublic = useSelector(selectIsPublic);
  const affinityEnabled = useSelector(selectAffinityEnabled);
  const version = useSelector(selectVersion);
  const updateAvailable = useSelector(selectUpdateAvailable);
  const { isMobile, setOpenMobile } = useSidebar();

  const closeOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const groups =
    affinityEnabled && !isPublic ? [...navGroups, socialGroup] : navGroups;

  // Most recent sync of the linked Spotify accounts
  const lastSync = (user?.spotifyAccounts ?? [])
    .map((account) => account.lastSyncAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={`/${periodSearch}`} onClick={closeOnMobile}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-sm">
                  <AudioLines className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Your Spotify</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("nav.appSubtitle")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={t(item.title)}
                      isActive={isActive(pathname, item.url)}>
                      <Link
                        to={`${item.url}${periodSearch}`}
                        onClick={closeOnMobile}>
                        {item.icon}
                        <span>{t(item.title)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {updateAvailable && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t("nav.updateAvailable")}>
                <a
                  href="https://github.com/razday/your_spotify_v2/releases"
                  target="_blank"
                  rel="noreferrer">
                  <ArrowUpCircle className="text-primary" />
                  <span>{t("nav.updateAvailable")}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {!isPublic && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={t("nav.settings")}
                isActive={pathname.startsWith("/settings")}>
                <Link to="/settings" onClick={closeOnMobile}>
                  <Settings />
                  <span>{t("nav.settings")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {user && !isPublic && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/15 font-medium text-primary">
                        {initials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user.username}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {lastSync
                          ? t("nav.syncedAgo", {
                              when: formatTimeAgo(lastSync),
                            })
                          : user.admin
                            ? t("common.admin")
                            : t("common.member")}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {user.admin ? t("common.admin") : t("common.member")}
                    {version ? ` · v${version}` : ""}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" onClick={closeOnMobile}>
                      <Settings />
                      {t("common.settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/logout">
                      <LogOut />
                      {t("common.logout")}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
