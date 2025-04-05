"use client";

import { useState } from "react";
import { Expense } from "@/types/expense";
import { Group } from "@/types/group";
import { useExpenseStore } from "@/store/expense-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ExpenseView from "../components/expense/ExpenseView";
import ExpenseEdit from "../components/expense/ExpenseEdit";

interface ExpensePopoutProps {
  expense: Expense | null;
  onClose: () => void;
  groups?: Group[];
}

export default function ExpensePopout({
  expense,
  onClose,
  groups,
}: ExpensePopoutProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { deleteExpense } = useExpenseStore();

  // Handle delete expense action
  const handleDelete = async () => {
    if (!expense) return;

    try {
      await deleteExpense(expense.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Handle save changes
  const handleSaveChanges = () => {
    setIsEditing(false);
    onClose();
  };

  if (!expense) return null;

  return (
    <Dialog open={!!expense} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit expense" : expense.name}</DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          <ExpenseView
            expense={expense}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onClose={onClose}
          />
        ) : (
          <ExpenseEdit
            expense={expense}
            onSave={handleSaveChanges}
            onCancel={handleCancelEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
