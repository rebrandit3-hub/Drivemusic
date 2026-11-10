import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { sidebarNavItems } from "@/features/navigation/data/navigation";
import { useTranslation } from "@/languages";
import { Tooltip } from "@/shared/ui";
import { cn } from "@/shared/lib";
import { useOfflineModeStore } from "@/features/connectivity";

export interface SidebarNavItemsProps {
  searchOpen: boolean;
  onSearchToggle: () => void;
}

/** Spotify-style caption under each icon, only in the mobile bottom bar. */
export function TabLabel({
  active,
  children,
}: {
  active: boolean;
  children: string;
}) {
  return (
    <span
      className={cn(
        "hidden max-md:block text-[10.5px] font-[600] leading-none tracking-[0.01em]",
        active ? "text-brand-ink" : "text-text-tertiary",
      )}
    >
      {children}
    </span>
  );
}

export function SidebarNavItems({
  searchOpen,
  onSearchToggle,
}: SidebarNavItemsProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const offline = useOfflineModeStore((state) => state.offline);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const isRouteActive = (href: string) => {
    if (pendingHref) return href === pendingHref;
    if (href === "/") {
      return pathname === "/" || pathname === "/home";
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const isItemActive = (id: string, href?: string) => {
    if (id === "search") {
      return searchOpen;
    }
    return href ? isRouteActive(href) : false;
  };

  return (
    <>
      {sidebarNavItems
        .filter((item) => item.id !== "settings")
        .filter((item) => !offline || item.id === "library")
        .map((item) => {
          const active = isItemActive(item.id, item.href);
          const Icon = item.Icon;
          const tooltipLabel = t(`common.sidebar.${item.id}`) || item.label;

          if (item.id === "search") {
            return (
              <Tooltip
                key={item.id}
                content={tooltipLabel}
                side="right"
                sideOffset={12}
              >
                <button
                  type="button"
                  aria-pressed={searchOpen}
                  onClick={onSearchToggle}
                  className="group relative inline-flex items-center justify-center max-md:min-w-[56px] max-md:min-h-[48px] max-md:flex-col max-md:gap-[3px] touch-manipulation bg-transparent border-0 p-0 cursor-pointer active:scale-[0.96] transition-transform duration-100"
                >
                  <Icon
                    size={26}
                    className={cn(
                      "relative z-10 text-text-primary transition-opacity duration-150 ease-out max-md:size-[24px]",
                      active
                        ? "opacity-100 max-md:text-brand-ink"
                        : "opacity-55 group-hover:opacity-90",
                    )}
                  />
                  <TabLabel active={active}>{tooltipLabel}</TabLabel>
                </button>
              </Tooltip>
            );
          }

          return (
            <Tooltip
              key={item.id}
              content={tooltipLabel}
              side="right"
              sideOffset={12}
            >
              <Link
                key={item.id}
                to={item.href!}
                aria-current={active ? "page" : undefined}
                onPointerDown={(event) => {
                  if (event.button === 0) setPendingHref(item.href!);
                }}
                onPointerLeave={(event) => {
                  if (event.buttons & 1) setPendingHref(null);
                }}
                onPointerCancel={() => setPendingHref(null)}
                className="group relative inline-flex items-center justify-center max-md:min-w-[56px] max-md:min-h-[48px] max-md:flex-col max-md:gap-[3px] touch-manipulation cursor-pointer active:scale-[0.96] transition-transform duration-100"
              >
                <Icon
                  size={26}
                  className={cn(
                    "relative z-10 text-text-primary max-md:size-[24px]",
                    active
                      ? "opacity-100 max-md:text-brand-ink"
                      : "opacity-55 transition-opacity duration-150 ease-out group-hover:opacity-90",
                  )}
                />
                <TabLabel active={active}>{tooltipLabel}</TabLabel>
              </Link>
            </Tooltip>
          );
        })}
    </>
  );
}
