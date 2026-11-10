import { sidebarNavItems } from "@/features/navigation/data/navigation";
import { useTranslation } from "@/languages";
import { useModalStore } from "@/features/library";
import { Tooltip } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { TabLabel } from "./SidebarNavItems";

export function SidebarSettingsButton() {
  const { t } = useTranslation();
  const settingsOpen = useModalStore((state) => state.settingsOpen);
  const toggleSettings = useModalStore((state) => state.toggleSettings);

  const settingsItem = sidebarNavItems.find((item) => item.id === "settings");
  if (!settingsItem) return null;

  const Icon = settingsItem.Icon;
  const tooltipLabel = t("common.sidebar.settings") || settingsItem.label;

  return (
    <Tooltip content={tooltipLabel} side="right" sideOffset={12}>
      <button
        type="button"
        aria-pressed={settingsOpen}
        onClick={toggleSettings}
        className="group relative inline-flex items-center justify-center max-md:min-w-[56px] max-md:min-h-[48px] max-md:flex-col max-md:gap-[3px] touch-manipulation bg-transparent border-0 p-0 cursor-pointer active:scale-[0.96] transition-transform duration-100"
      >
        <Icon
          size={26}
          className={cn(
            "relative z-10 text-text-primary transition-opacity duration-150 ease-out max-md:size-[24px]",
            settingsOpen
              ? "opacity-100 max-md:text-brand-ink"
              : "opacity-55 group-hover:opacity-90",
          )}
        />
        <TabLabel active={settingsOpen}>{tooltipLabel}</TabLabel>
      </button>
    </Tooltip>
  );
}
