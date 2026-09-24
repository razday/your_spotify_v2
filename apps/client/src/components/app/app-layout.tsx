import { Eye } from "lucide-react";
import { ReactNode } from "react";
import { useSelector } from "react-redux";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  selectIsPublic,
  selectUser,
} from "@/services/redux/modules/user/selector";

import { AppSidebar } from "./app-sidebar";
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
  const isPublic = useSelector(selectIsPublic);
  const user = useSelector(selectUser);

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
              <span className="hidden sm:inline">Viewing</span> {user?.username}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <SearchCommand />
            {showPeriod && <PeriodPicker />}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
      <PlaylistDialog />
    </SidebarProvider>
  );
}
