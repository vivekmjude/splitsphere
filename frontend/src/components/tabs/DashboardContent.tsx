"use client";

import { useState, useMemo, memo } from "react";
import ExpenseList from "@/components/ExpenseList";
import ExpenseDialog from "@/components/ExpenseDialog";
import TestDataGenerator from "@/components/TestDataGenerator";
import { Expense } from "@/types/expense";
import { useGroupsStore } from "@/store/groups-store";
import { useExpenseStore } from "@/store/expense-store";

const DashboardContent = memo(function DashboardContent() {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const { groups } = useGroupsStore();
  const { expenses, currentUser, addExpense, isLoading } = useExpenseStore();

  const handleAddExpense = async (newExpense: Expense) => {
    try {
      await addExpense(newExpense);
      setIsExpenseDialogOpen(false);
    } catch (error) {
      console.error("Failed to add expense:", error);
      // Could show an error toast here
    }
  };

  // Sort expenses by date in descending order (most recent first)
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [expenses]);

  const personalExpenses = useMemo(() => {
    return sortedExpenses.filter((expense) => !expense.groupId);
  }, [sortedExpenses]);

  const groupExpenses = useMemo(() => {
    return sortedExpenses.filter((expense) => expense.groupId);
  }, [sortedExpenses]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2">
          Add Expense
        </button>
      </div>

      {/* Test Data Generator */}
      <TestDataGenerator />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p>Loading expenses...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Personal Expenses</h2>
            {personalExpenses.length > 0 ? (
              <ExpenseList expenses={personalExpenses} />
            ) : (
              <p className="text-muted-foreground">No personal expenses yet.</p>
            )}
          </div>

          <h2 className="mb-4 text-xl font-semibold">Group Expenses</h2>
          {groupExpenses.length > 0 ? (
            <div>
              <ExpenseList
                expenses={groupExpenses}
                showGroupName
                groups={groups}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">No group expenses yet.</p>
          )}
        </div>
      )}

      <ExpenseDialog
        open={isExpenseDialogOpen}
        onClose={() => setIsExpenseDialogOpen(false)}
        onSubmit={handleAddExpense}
        currentUser={currentUser}
      />
    </div>
  );
});

export default DashboardContent;
