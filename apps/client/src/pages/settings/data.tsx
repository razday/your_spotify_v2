import { FileUp, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { SectionCard } from "@/components/stats/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { MessageKey, translate as t } from "@/lib/i18n";
import { selectImportStates } from "@/services/redux/modules/import/selector";
import {
  cleanupImport,
  getImports,
  startImportFullPrivacy,
  startImportPrivacy,
} from "@/services/redux/modules/import/thunk";
import { ImporterStateType } from "@/services/redux/modules/import/types";
import { useAppDispatch } from "@/services/redux/tools";

const METHODS = [
  {
    type: ImporterStateType.fullPrivacy,
    title: "import.full",
    badge: "import.recommended",
    description: "import.fullDescription",
  },
  {
    type: ImporterStateType.privacy,
    title: "import.privacy",
    description: "import.privacyDescription",
  },
] as const satisfies {
  type: ImporterStateType;
  title: MessageKey;
  badge?: MessageKey;
  description: MessageKey;
}[];

const STATUS: Record<
  string,
  { label: MessageKey; variant: "default" | "secondary" | "destructive" }
> = {
  progress: { label: "import.status.progress", variant: "secondary" },
  success: { label: "import.status.success", variant: "default" },
  failure: { label: "import.status.failure", variant: "destructive" },
  "failure-removed": { label: "import.status.failure", variant: "destructive" },
};

export function ImportCard() {
  const dispatch = useAppDispatch();
  const imports = useSelector(selectImportStates);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const running = imports?.some((i) => i.status === "progress");

  useEffect(() => {
    dispatch(getImports()).catch(() => {});
  }, [dispatch]);

  // Follow the progress while an import runs
  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(
      () => dispatch(getImports(true)).catch(() => {}),
      5000,
    );
    return () => clearInterval(interval);
  }, [running, dispatch]);

  const onFiles = async (
    type: ImporterStateType,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    setUploading(type);
    const action =
      type === ImporterStateType.fullPrivacy
        ? startImportFullPrivacy({ files })
        : startImportPrivacy({ files });
    await dispatch(action).catch(() => {});
    event.target.value = "";
    setUploading(null);
  };

  return (
    <SectionCard
      title={t("import.title")}
      description={t("import.description")}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          {METHODS.map((method) => (
            <div
              key={method.type}
              className="flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t(method.title)}</span>
                {"badge" in method && (
                  <Badge variant="secondary">{t(method.badge)}</Badge>
                )}
              </div>
              <p className="flex-1 text-xs text-muted-foreground">
                {t(method.description)}
              </p>
              <input
                ref={(el) => {
                  inputs.current[method.type] = el;
                }}
                type="file"
                accept=".json,application/json"
                multiple
                hidden
                onChange={(event) => onFiles(method.type, event)}
              />
              <Button
                variant="outline"
                className="w-fit"
                disabled={Boolean(running) || uploading !== null}
                onClick={() => inputs.current[method.type]?.click()}>
                {uploading === method.type ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <FileUp />
                )}
                {t("import.choose")}
              </Button>
            </div>
          ))}
        </div>
        {imports && imports.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t("import.yours")}</p>
            {imports.map((item) => {
              const status = STATUS[item.status] ?? STATUS.progress!;
              const percent =
                item.total > 0 ? (item.current / item.total) * 100 : 0;
              return (
                <div
                  key={item._id}
                  className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={status.variant}>{t(status.label)}</Badge>
                      <span className="text-muted-foreground">
                        {item.type === ImporterStateType.fullPrivacy
                          ? t("import.extended")
                          : t("import.privacy")}{" "}
                        · {formatDate(item.createdAt, "PPp")}
                      </span>
                    </div>
                    {item.status === "failure" && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            dispatch(
                              item.type === ImporterStateType.fullPrivacy
                                ? startImportFullPrivacy({ id: item._id })
                                : startImportPrivacy({ id: item._id }),
                            ).catch(() => {})
                          }>
                          <RotateCcw />
                          {t("import.retry")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            dispatch(cleanupImport(item._id)).catch(() => {})
                          }>
                          <Trash2 />
                          {t("import.clean")}
                        </Button>
                      </div>
                    )}
                  </div>
                  {item.status === "progress" && (
                    <div className="flex items-center gap-3">
                      <Progress value={percent} className="flex-1" />
                      <span className="text-xs text-muted-foreground tabular">
                        {item.current} / {item.total}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
