"use client";

import { useState, useMemo, memo, useEffect } from "react";
import { DashboardContent, GroupsContent, FriendsContent } from "@/components/tabs";
import MobileTabBar from "@/components/MobileTabBar";
import { TABS, TabType, getActiveTabFromHash } from "@/lib/constants";

const HomePage = memo(function Home() {
  // Use hash-based navigation instead of Next.js router
  const [activeTab, setActiveTab] = useState<TabType>(TABS.DASHBOARD);
  
  // Initialize tab from URL hash on mount
  useEffect(() => {
    setActiveTab(getActiveTabFromHash());
    
    // Listen for hash changes
    const handleHashChange = () => {
      setActiveTab(getActiveTabFromHash());
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Render tab content based on active tab
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case TABS.GROUPS:
        return <GroupsContent />;
      case TABS.FRIENDS:
        return <FriendsContent />;
      case TABS.DASHBOARD:
      default:
        return <DashboardContent />;
    }
  }, [activeTab]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Mobile Tab Bar */}
      <MobileTabBar activeTab={activeTab} />
      
      {/* Tab content with proper padding */}
      <div className="p-4 md:p-8 overflow-y-auto">{renderTabContent}</div>
    </div>
  );
});

export default HomePage;
