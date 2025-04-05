"use client";
import { User } from "@/types/expense";
import {
  useMemo,
  memo,
  useCallback,
  MouseEvent,
  useEffect,
  useState,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import SyncStatus from "./SyncStatus";
import { HomeIcon, UsersIcon, UserIcon } from "lucide-react";
import { TABS, TabType, getActiveTabFromHash } from "@/lib/constants";

// Navigation config - constant data that won't change
const NAV_ITEMS = [
  { hash: "", label: "Dashboard", tabId: TABS.DASHBOARD, icon: HomeIcon },
  { hash: TABS.GROUPS, label: "Groups", tabId: TABS.GROUPS, icon: UsersIcon },
  { hash: TABS.FRIENDS, label: "Friends", tabId: TABS.FRIENDS, icon: UserIcon },
] as const;

// Constant user data - move outside component to prevent hydration issues
const CURRENT_USER: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com",
  defaultCurrency: "USD",
} as const;

// Pre-compute constant values
const USER_INITIAL = CURRENT_USER.name[0];

// Memoized navigation item to prevent re-renders
const NavItem = memo(function NavItem({
  hash,
  label,
  isActive,
  onClick,
  isCollapsed,
  icon: Icon,
  ref,
}: {
  hash: string;
  label: string;
  isActive: boolean;
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  isCollapsed: boolean;
  icon: React.ElementType;
  ref?: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <li>
      <a
        href={`#${hash}`}
        onClick={onClick}
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "text-sidebar-foreground relative z-10 flex items-center gap-2 rounded-lg p-2 transition-colors",
          isActive && "text-sidebar-accent-foreground",
          isCollapsed && "justify-center"
        )}
        title={isCollapsed ? label : undefined}
      >
        <span className="flex h-5 w-5 items-center justify-center">
          <Icon className="h-5 w-5" />
        </span>

        {!isCollapsed && <span>{label}</span>}
      </a>
    </li>
  );
});

interface SidebarProps {
  initialActiveTab?: TabType;
}

function Sidebar({ initialActiveTab }: SidebarProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>(
    initialActiveTab || TABS.DASHBOARD
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tabsRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    left: number;
    width: number | string;
    height: number;
    opacity: number;
  }>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  // Function to update indicator position
  const updateIndicatorPosition = useCallback(() => {
    const activeElement = tabsRef.current.get(activeTab);
    if (activeElement && navRef.current) {
      // Use requestAnimationFrame to ensure DOM measurements are accurate
      requestAnimationFrame(() => {
        const { top, height } = activeElement.getBoundingClientRect();
        const parentRect = navRef.current?.getBoundingClientRect() || {
          top: 0,
          left: 0,
        };

        setIndicatorStyle({
          top: top - parentRect.top,
          left: 0,
          width: "100%", // Always use 100% width
          height,
          opacity: 1,
        });
      });
    }
  }, [activeTab, isCollapsed]);

  // Check if we're on mobile on initial load and on window resize
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);

      // On mobile, we want the sidebar completely hidden, not just collapsed
      if (isMobileView) {
        setIsCollapsed(true);
      }
    };

    // Set initial value
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Update active tab when hash changes
  useEffect(() => {
    if (!initialActiveTab) {
      setActiveTab(getActiveTabFromHash());
    }

    const handleHashChange = () => {
      if (!initialActiveTab) {
        setActiveTab(getActiveTabFromHash());
      }
      // Auto-collapse on mobile after navigation
      if (isMobile) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [isMobile, initialActiveTab]);

  // Update active tab when initialActiveTab prop changes
  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  // Update indicator position when active tab or sidebar collapse state changes
  useEffect(() => {
    updateIndicatorPosition();
  }, [activeTab, isCollapsed, updateIndicatorPosition]);

  // Additional useEffect for handling resize and initial position delay
  useEffect(() => {
    // Update after DOM is fully rendered
    const initialTimer = setTimeout(updateIndicatorPosition, 150);

    // Update on window resize
    window.addEventListener("resize", updateIndicatorPosition);

    // Set to full opacity after a delay
    const opacityTimer = setTimeout(() => {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 1 }));
    }, 10);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(opacityTimer);
      window.removeEventListener("resize", updateIndicatorPosition);
    };
  }, [updateIndicatorPosition]);

  // Handle navigation click
  const handleNavClick = useCallback(() => {
    // We let the default behavior happen for hash links
    // This will automatically update the URL hash without triggering page reloads
  }, []);

  // Toggle sidebar collapsed state
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    // Wait for DOM to fully update before repositioning
    setTimeout(updateIndicatorPosition, 150);
  }, [updateIndicatorPosition]);

  // Memoize the navigation items to prevent unnecessary re-renders
  const navigationItems = useMemo(
    () =>
      NAV_ITEMS.map(({ hash, label, tabId, icon }) => (
        <NavItem
          key={tabId}
          hash={hash}
          label={label}
          isActive={activeTab === tabId}
          onClick={handleNavClick}
          isCollapsed={isCollapsed}
          icon={icon}
          ref={(el) => {
            if (el) tabsRef.current.set(tabId, el);
            else tabsRef.current.delete(tabId);
          }}
        />
      )),
    [activeTab, handleNavClick, isCollapsed]
  );

  return (
    <>
      {/* Mobile overlay when sidebar is open */}
      {isMobile && !isCollapsed && (
        <div
          className="overlay-fade-in fixed inset-0 z-10 bg-black/50"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "bg-sidebar border-sidebar-border relative z-40 flex h-full flex-col border-r p-4 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isMobile && !isCollapsed
            ? "sidebar-slide-in fixed inset-y-0 left-0"
            : "",
          isMobile && isCollapsed
            ? "fixed inset-y-0 -left-16 overflow-hidden"
            : ""
        )}
        aria-label="Main navigation"
      >
        <div
          className={cn(
            "mb-8 flex items-center justify-between",
            isCollapsed && "justify-center"
          )}
        >
          {!isCollapsed && (
            <h1 className="text-sidebar-foreground text-xl font-bold">
              SplitSphere
            </h1>
          )}
          {isCollapsed && <span className="text-xl font-bold">S</span>}
          <div className="flex items-center">
            {!isCollapsed && <ThemeToggle />}
            <button
              onClick={toggleSidebar}
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent ml-2 rounded-lg p-1.5",
                isMobile && isCollapsed
                  ? "bg-sidebar fixed left-4 top-4 z-30 shadow-md"
                  : ""
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? "→" : "←"}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="mb-6">
            <div
              className="bg-sidebar-accent text-sidebar-accent-foreground flex items-center gap-3 rounded-lg p-2"
              role="status"
              aria-label="User profile"
            >
              <div
                className="bg-sidebar-primary text-sidebar-primary-foreground flex h-8 w-8 items-center justify-center rounded-full"
                aria-hidden="true"
              >
                {USER_INITIAL}
              </div>
              <div>
                <p className="text-sm font-medium">{CURRENT_USER.name}</p>
                <p className="text-xs opacity-80">{CURRENT_USER.email}</p>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mb-6 flex justify-center">
            <div
              className="bg-sidebar-primary text-sidebar-primary-foreground flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="User profile"
            >
              {USER_INITIAL}
            </div>
          </div>
        )}

        <nav ref={navRef} className="relative flex-1">
          {/* Sliding indicator */}
          <div
            className="bg-sidebar-accent absolute rounded-lg transition-all duration-300 ease-in-out"
            style={{
              top: `${indicatorStyle.top}px`,
              left: 0,
              width:
                typeof indicatorStyle.width === "number"
                  ? `${indicatorStyle.width}px`
                  : indicatorStyle.width,
              height: `${indicatorStyle.height}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
          <ul
            className={cn(
              "relative z-10 space-y-2",
              isCollapsed && "flex flex-col items-center"
            )}
          >
            {navigationItems}
          </ul>
        </nav>

        <div
          className={cn(
            "border-sidebar-border mt-6 border-t pt-4",
            isCollapsed && "flex justify-center"
          )}
        >
          {!isCollapsed ? <SyncStatus /> : <SyncStatus compact />}
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);
