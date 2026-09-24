import { Compass, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { translate as t } from "@/lib/i18n";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Compass className="size-7" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{t("error.notFound")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("error.notFoundHint")}
        </p>
      </div>
      <Button asChild>
        <Link to="/">{t("error.backOverview")}</Link>
      </Button>
    </div>
  );
}

// Reached when API_ENDPOINT points to the frontend instead of the backend
export function ApiEndpointErrorPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 p-6">
      <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
        <TriangleAlert className="size-6" />
      </div>
      <h1 className="text-2xl font-semibold">{t("error.apiTitle")}</h1>
      <p className="text-muted-foreground">{t("error.apiText")}</p>
    </div>
  );
}
