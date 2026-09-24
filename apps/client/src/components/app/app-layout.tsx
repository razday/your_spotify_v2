import { Eye, Sparkles, TriangleAlert } from "lucide-react";
import { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { translatePlural, useT } from "@/lib/i18n";
import { expiredAccounts, scopesMissingAccounts } from "@/lib/spotify";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";

import { AppFooter } from "./app-footer";
import { AppSidebar } from "./app-sidebar";
import { NowPlaying } from "./now-playing";
import { PeriodPicker } from "./period-picker";
import { PlaylistDialog } from "./playlist-dialog";
import { SearchCommand } from "./search-command";
import { ThemeToggle } from "./theme-toggle";

interface AppLayoutProps {
  children: ReactNode;
  // Pages that do not depend on the period hide the picker
  showPeriod?: boolean;
}

export function AppLayout({ children, showPeriod = true }: AppLayoutProps) {
  const t = useT();
  const isPublic = useSelector(selectIsPublic);
  const user = useSelector(selectUser);
  const { pathname } = useLocation();
  const expired = isPublic ? [] : expiredAccounts(user);
  const missingScopes = isPublic ? [] : scopesMissingAccounts(user);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md md:rounded-t-xl md:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          {isPublic && (
            <span className="flex items-center gap-1.5 rounded-full bg-chart-2/15 px-2.5 py-1 text-xs font-medium text-chart-2">
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">
                {t("header.viewing")}
              </span>{" "}
              {user?.username}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <NowPlaying />
            <SearchCommand />
            {showPeriod && <PeriodPicker />}
            <ThemeToggle />
          </div>
        </header>
        {expired.length > 0 && !pathname.startsWith("/settings") && (
          <div className="flex flex-wrap items-center gap-3 border-b bg-chart-4/10 px-4 py-2.5 text-sm md:px-6">
            <TriangleAlert className="size-4 shrink-0 text-chart-4" />
            <span className="flex-1">
              {translatePlural("header.expiredBanner", expired.length)}
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link to="/settings/account">{t("header.expiredAction")}</Link>
            </Button>
          </div>
        )}
        {expired.length === 0 &&
          missingScopes.length > 0 &&
          !pathname.startsWith("/settings") && (
            <div className="flex flex-wrap items-center gap-3 border-b bg-primary/8 px-4 py-2.5 text-sm md:px-6">
              <Sparkles className="size-4 shrink-0 text-primary" />
              <span className="flex-1">{t("header.scopesBanner")}</span>
              <Button size="sm" variant="outline" asChild>
                <Link to="/settings/account">{t("accounts.relink")}</Link>
              </Button>
            </div>
          )}
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </main>
        <AppFooter className="px-4 pb-5 md:px-6" />
      </SidebarInset>
      <PlaylistDialog />
    </SidebarProvider>
  );
}
