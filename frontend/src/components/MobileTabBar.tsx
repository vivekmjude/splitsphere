"use client";

import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HomeIcon, UsersIcon, UserIcon } from "lucide-react";
import SyncStatus from "./SyncStatus";
import { TABS, TabType } from "@/lib/constants";

// Navigation config - constant data that won't change
const NAV_ITEMS = [
  { hash: "", label: "Dashboard", tabId: TABS.DASHBOARD, icon: HomeIcon },
  { hash: TABS.GROUPS, label: "Groups", tabId: TABS.GROUPS, icon: UsersIcon },
  { hash: TABS.FRIENDS, label: "Friends", tabId: TABS.FRIENDS, icon: UserIcon },
] as const;

interface MobileTabBarProps {
  activeTab: TabType;
}

const MobileTabBar = memo(function MobileTabBar({ activeTab }: MobileTabBarProps) {
  const tabsRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  // Track mounted state to prevent FOUC
  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to update indicator position
  const updateIndicatorPosition = () => {
    const activeElement = tabsRef.current.get(activeTab);
    if (activeElement && containerRef.current) {
      // Use requestAnimationFrame to ensure DOM measurements are accurate
      requestAnimationFrame(() => {
        const { left, width, height } = activeElement.getBoundingClientRect();
        const parentRect = containerRef.current?.getBoundingClientRect();
        const parentLeft = parentRect ? parentRect.left : 0;
        
        setIndicatorStyle({
          left: left - parentLeft,
          width,
          height,
          opacity: 1,
        });
      });
    }
  };

  // Update indicator position when active tab changes
  useEffect(() => {
    updateIndicatorPosition();
  }, [activeTab]);

  // Also update position on window resize and after a short delay to ensure DOM is ready
  useEffect(() => {
    // Update after 100ms to ensure layout is complete
    const initialTimer = setTimeout(updateIndicatorPosition, 100);
    
    // Update on window resize
    window.addEventListener('resize', updateIndicatorPosition);
    
    // Set to full opacity after a delay
    const opacityTimer = setTimeout(() => {
      setIndicatorStyle(prev => ({ ...prev, opacity: 1 }));
    }, 10);
    
    return () => {
      clearTimeout(initialTimer);
      clearTimeout(opacityTimer);
      window.removeEventListener('resize', updateIndicatorPosition);
    };
  }, []);

  // Prevent flash of unstyled content by not rendering until mounted
  if (!mounted) {
    return null;
  }
  
  // Render the tabs
  return (
    <div className="md:hidden sticky top-0 bg-background z-30 border-b border-border shadow-sm">
      <div className="flex justify-between items-center px-4 py-2">
        <h1 className="text-lg font-bold">SplitSphere</h1>
        <SyncStatus compact />
      </div>
      <div ref={containerRef} className="flex gap-1 overflow-x-auto px-2 pb-2 relative">
        {/* Sliding indicator */}
        <div 
          className="absolute bg-sidebar-accent rounded-lg transition-all duration-300 ease-in-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
            zIndex: 0,
          }}
        />
        
        {NAV_ITEMS.map(({ hash, label, tabId, icon: Icon }) => (
          <a
            key={tabId}
            href={`#${hash}`}
            ref={el => {
              if (el) tabsRef.current.set(tabId, el);
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-1 text-center flex flex-col items-center gap-1 relative z-10",
              activeTab === tabId
                ? "text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
            )}
            aria-current={activeTab === tabId ? "page" : undefined}
          >
            <Icon className="w-5 h-5" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
});

export default MobileTabBar; 