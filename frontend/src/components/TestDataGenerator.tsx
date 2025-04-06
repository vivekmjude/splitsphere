"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateAndAddDummyData } from "@/lib/generate-dummy-data";
import { useExpenseStore } from "@/store/expense-store";
import { useGroupsStore } from "@/store/groups-store";
import { useFriendsStore } from "@/store/friends-store";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestDataGenerator() {
  const [groupExpenses, setGroupExpenses] = useState<string>("50");
  const [personalExpenses, setPersonalExpenses] = useState<string>("30");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const { loadExpenses } = useExpenseStore();
  const { loadGroups } = useGroupsStore();
  const { loadFriends } = useFriendsStore();

  const handleGenerateData = async () => {
    setIsGenerating(true);
    setResult(null);

    try {
      const count = await generateAndAddDummyData(
        parseInt(groupExpenses) || 0,
        parseInt(personalExpenses) || 0
      );
      setResult(`Successfully generated ${count} new expenses!`);

      // Reload expenses to see the new data
      await loadExpenses();
    } catch (error) {
      console.error("Failed to generate test data:", error);
      setResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDatabase = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset the database? This will delete ALL data and reload default sample data."
      )
    ) {
      return;
    }

    setIsResetting(true);
    setResult(null);

    try {
      // Clear all data
      await Promise.all([
        db.expenses.clear(),
        db.groups.clear(),
        db.friends.clear(),
        db.syncQueue.clear(),
        db.user.clear(),
        db.settlementPayments.clear(),
      ]);

      // Reload initial data
      await Promise.all([loadExpenses(), loadGroups(), loadFriends()]);

      setResult("Database reset successfully with default sample data.");
    } catch (error) {
      console.error("Failed to reset database:", error);
      setResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">
          Generate Test Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1 text-sm font-medium">Group Expenses</div>
              <Input
                id="group-expenses"
                type="number"
                min="0"
                max="1000"
                value={groupExpenses}
                onChange={(e) => setGroupExpenses(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">Personal Expenses</div>
              <Input
                id="personal-expenses"
                type="number"
                min="0"
                max="1000"
                value={personalExpenses}
                onChange={(e) => setPersonalExpenses(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateData}
              disabled={isGenerating || isResetting}
              className="flex-1"
            >
              {isGenerating ? "Generating..." : "Generate Test Data"}
            </Button>

            <Button
              onClick={handleResetDatabase}
              disabled={isResetting || isGenerating}
              variant="destructive"
              className="flex-1"
            >
              {isResetting ? "Resetting..." : "Reset Database"}
            </Button>
          </div>
          {result && (
            <div
              className={`mt-2 rounded p-2 ${result.startsWith("Error") ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300"}`}
            >
              {result}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
