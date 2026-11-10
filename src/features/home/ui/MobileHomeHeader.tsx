import { useTranslation } from "@/languages";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useModalStore } from "@/features/library";
import logo from "@/assets/logo.svg";

function greetingKey(hour: number): string {
  if (hour < 5) return "home.goodNight";
  if (hour < 12) return "home.goodMorning";
  if (hour < 18) return "home.goodAfternoon";
  return "home.goodEvening";
}

/**
 * Phone-only top bar for Home: brand mark, a time-of-day greeting and the
 * account avatar that opens settings. Hidden from md up, where the sidebar
 * and window chrome take over.
 */
export function MobileHomeHeader() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const toggleSettings = useModalStore((state) => state.toggleSettings);
  const name =
    (user as { displayName?: string; username?: string } | null)?.displayName ??
    (user as { username?: string } | null)?.username ??
    "";
  const initial = name.trim().charAt(0).toUpperCase() || "D";

  return (
    <div className="hidden max-md:flex items-center gap-[12px] px-[10px] pt-[6px] pb-[16px]">
      <button
        type="button"
        onClick={toggleSettings}
        aria-label={t("common.sidebar.settings") || "Settings"}
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 bg-brand text-[15px] font-[700] text-brand-contrast cursor-pointer active:scale-95 transition-transform touch-manipulation"
      >
        {initial}
      </button>
      <h1 className="m-0 min-w-0 flex-1 truncate text-[22px] font-[700] leading-none tracking-[-0.02em] text-text-primary">
        {t(greetingKey(new Date().getHours()))}
      </h1>
      <img
        src={logo}
        alt="DriveMusic"
        width={26}
        height={20}
        draggable={false}
        className="h-[20px] w-auto shrink-0 select-none theme-logo invert dark:invert-0 opacity-90"
      />
    </div>
  );
}
