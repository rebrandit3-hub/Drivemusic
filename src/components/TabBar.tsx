import { NavLink } from "react-router-dom";
import { Home, Library, Search } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/search", label: "Search", Icon: Search },
  { to: "/library", label: "Your Library", Icon: Library },
];

export function TabBar() {
  return (
    <nav className="pb-safe grid grid-cols-3 bg-gradient-to-t from-bg via-bg/95 to-bg/70 backdrop-blur-md">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold ${isActive ? "text-text" : "text-faint"}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.6 : 2} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
