import {
  AudioLines,
  CalendarClock,
  Disc3,
  Gauge,
  Hourglass,
  LogOut,
  MicVocal,
  Music2,
  Palette,
  Settings,
  Sparkles,
  Telescope,
  Users,
  ChevronsUpDown,
  History,
  ArrowUpCircle,
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
import { initials } from "@/lib/format";
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
  title: string;
  url: string;
  icon: ReactNode;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Dashboard",
    items: [
      { title: "Overview", url: "/", icon: <Gauge /> },
      { title: "Recap", url: "/recap", icon: <Sparkles /> },
    ],
  },
  {
    label: "Tops",
    items: [
      { title: "Top tracks", url: "/top/tracks", icon: <Music2 /> },
      { title: "Top artists", url: "/top/artists", icon: <MicVocal /> },
      { title: "Top albums", url: "/top/albums", icon: <Disc3 /> },
    ],
  },
  {
    label: "Explore",
    items: [
      { title: "History", url: "/history", icon: <History /> },
      { title: "Habits", url: "/habits", icon: <CalendarClock /> },
      { title: "Taste", url: "/taste", icon: <Palette /> },
      { title: "Discoveries", url: "/discoveries", icon: <Telescope /> },
      { title: "Sessions", url: "/sessions", icon: <Hourglass /> },
    ],
  },
];

function isActive(pathname: string, url: string) {
  return url === "/" ? pathname === "/" : pathname.startsWith(url);
}

export function AppSidebar() {
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

  const groups = [
    ...navGroups,
    ...(affinityEnabled && !isPublic
      ? [
          {
            label: "Social",
            items: [{ title: "Affinity", url: "/affinity", icon: <Users /> }],
          },
        ]
      : []),
  ];

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
                    Listening stats
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
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive(pathname, item.url)}>
                      <Link
                        to={`${item.url}${periodSearch}`}
                        onClick={closeOnMobile}>
                        {item.icon}
                        <span>{item.title}</span>
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
              <SidebarMenuButton asChild tooltip="Update available">
                <a
                  href="https://github.com/razday/your_spotify_v2/releases"
                  target="_blank"
                  rel="noreferrer">
                  <ArrowUpCircle className="text-primary" />
                  <span>Update available</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {!isPublic && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Settings"
                isActive={pathname.startsWith("/settings")}>
                <Link to="/settings" onClick={closeOnMobile}>
                  <Settings />
                  <span>Settings</span>
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
                        {user.admin ? "Admin" : "Member"}
                        {version ? ` · v${version}` : ""}
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
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {user.spotifyAccount?.displayName
                      ? `Spotify: ${user.spotifyAccount.displayName}`
                      : "Signed in"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" onClick={closeOnMobile}>
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/logout">
                      <LogOut />
                      Log out
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
