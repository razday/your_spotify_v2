import { ArrowUpCircle, GitFork } from "lucide-react";
import { useSelector } from "react-redux";

import { translate as t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  selectUpdateAvailable,
  selectVersion,
} from "@/services/redux/modules/settings/selector";

const REPOSITORY = "https://github.com/razday/your_spotify_v2";

export function AppFooter({ className }: { className?: string }) {
  const serverVersion = useSelector(selectVersion);
  const update = useSelector(selectUpdateAvailable);
  const clientVersion = __CLIENT_VERSION__;
  const version = serverVersion ?? clientVersion;

  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}>
      <a
        href={REPOSITORY}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 hover:text-foreground">
        <GitFork className="size-3.5" />
        Your Spotify v2
      </a>
      <a
        href={`${REPOSITORY}/releases`}
        target="_blank"
        rel="noreferrer"
        className="tabular hover:text-foreground"
        title={
          serverVersion && serverVersion !== clientVersion
            ? t("footer.versions", {
                server: serverVersion,
                client: clientVersion,
              })
            : undefined
        }>
        v{version}
        {serverVersion && serverVersion !== clientVersion && (
          <span className="text-chart-4"> · web v{clientVersion}</span>
        )}
      </a>
      {update && (
        <a
          href={`${REPOSITORY}/releases/latest`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowUpCircle className="size-3.5" />
          {t("footer.update")}
        </a>
      )}
    </footer>
  );
}
