"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { TABS, TabType, getActiveTabFromHash } from "@/lib/constants";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>(TABS.DASHBOARD);
  
  // Initialize tab from URL hash on mount and listen for changes
  useEffect(() => {
    setActiveTab(getActiveTabFromHash());
    
    const handleHashChange = () => {
      setActiveTab(getActiveTabFromHash());
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar initialActiveTab={activeTab} />
      <main className="flex-1 overflow-auto w-full">
        {children}
      </main>
    </div>
  );
} 