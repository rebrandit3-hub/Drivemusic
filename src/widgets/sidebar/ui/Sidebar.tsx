import { memo } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { SidebarLibrary } from "./SidebarLibrary";
import { SidebarNavItems } from "./SidebarNavItems";
import { SidebarSettingsButton } from "./SidebarSettingsButton";

export interface SidebarProps {
  searchOpen: boolean;
  onSearchToggle: () => void;
}

function Sidebar({ searchOpen, onSearchToggle }: SidebarProps) {
  return (
    <div className="h-full w-[52px] flex flex-col items-center gap-[6px] max-md:w-full">
      {/* one panel for nav and library; hugs its content and scrolls the
          library once it reaches the window bottom */}
      <div className="w-full min-h-0 flex flex-col rounded-item bg-bg-glass backdrop-blur-[20px] max-md:h-full max-md:rounded-none max-md:bg-bg-canvas/90 max-md:backdrop-blur-[24px] max-md:border-t max-md:border-border-primary">
        <nav className="shrink-0 flex flex-col items-center gap-[20px] py-[16px] max-md:h-full max-md:flex-row max-md:justify-around max-md:gap-0 max-md:py-0 max-md:px-[8px]">
          <Link
            to="/"
            title="DriveMusic"
            className="flex items-center justify-center cursor-pointer active:scale-95 transition-transform max-md:hidden"
          >
            <img
              src={logo}
              alt="DriveMusic"
              width={30}
              height={23}
              className="h-[23px] w-auto object-contain theme-logo invert dark:invert-0 select-none"
              draggable={false}
            />
          </Link>
          <SidebarNavItems
            searchOpen={searchOpen}
            onSearchToggle={onSearchToggle}
          />
          <SidebarSettingsButton />
        </nav>

        <div className="contents max-md:hidden">
          <SidebarLibrary />
        </div>
      </div>
    </div>
  );
}

export default memo(Sidebar);
