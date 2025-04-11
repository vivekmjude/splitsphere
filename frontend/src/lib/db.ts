import Dexie from "dexie";
import type { Expense, User, SettlementPayment } from "@/types/expense";
import type { Group, Friend } from "@/types/group";
import { v4 as uuidv4 } from "uuid";

interface SyncItem {
  id: string;
  table: string;
  action: "add" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SyncedItem {
  _synced: boolean;
  _lastModified: number;
}

// Validate percentage splits total 100%
function validatePercentageSplits(expense: Expense): boolean {
  if (expense.splitType !== "PERCENTAGE") return true;

  const totalPercentage = expense.splits.reduce((sum, split) => {
    return sum + (split.percentage || 0);
  }, 0);

  return Math.abs(totalPercentage - 100) < 0.01;
}

// Validate payment total matches expense amount
function validatePayments(expense: Expense): boolean {
  if (!expense.payments || expense.payments.length === 0) {
    return true; // If no payments specified, assume valid (backward compatibility)
  }

  const totalPayments = expense.payments.reduce((sum, payment) => {
    return sum + payment.amount;
  }, 0);

  return Math.abs(totalPayments - expense.amount) < 0.01;
}

export class SplitSphereDB extends Dexie {
  expenses!: Dexie.Table<Expense & SyncedItem, string>;
  groups!: Dexie.Table<Group & SyncedItem, string>;
  friends!: Dexie.Table<Friend & SyncedItem, string>;
  user!: Dexie.Table<User, string>;
  syncQueue!: Dexie.Table<SyncItem, string>;
  settlementPayments!: Dexie.Table<SettlementPayment & SyncedItem, string>;

  constructor() {
    super("splitSphereDB");

    this.version(1).stores({
      expenses: "id, date, paidBy, groupId, _synced, _lastModified",
      groups: "id, name, createdBy, _synced, _lastModified",
      friends: "id, email, status, _synced, _lastModified",
      user: "id",
      syncQueue: "id, table, action, timestamp",
    });

    // Add version upgrade to add the settlement payments table
    this.version(2)
      .stores({
        settlementPayments:
          "id, fromUserId, toUserId, date, _synced, _lastModified, [fromUserId+toUserId], *relatedExpenseIds",
      })
      .upgrade((tx) => {
        console.log(
          "Upgrading database to version 2 - adding settlementPayments table"
        );
      });

    // Add hooks for expense validation
    this.expenses.hook("creating", (primKey, obj) => {
      const expense = obj as Expense;
      if (!validatePercentageSplits(expense)) {
        throw new Error("Percentage splits must total 100%");
      }
      if (!validatePayments(expense)) {
        throw new Error("Total payments must equal expense amount");
      }
    });

    this.expenses.hook("updating", (modifications, primKey, obj) => {
      const expense = { ...(obj as Expense), ...modifications };
      if (!validatePercentageSplits(expense)) {
        throw new Error("Percentage splits must total 100%");
      }
      if (!validatePayments(expense)) {
        throw new Error("Total payments must equal expense amount");
      }
    });
  }
}

export const db = new SplitSphereDB();

// Helper functions for common operations
export async function addToSyncQueue(
  table: string,
  action: "add" | "update" | "delete",
  data: Record<string, unknown>
): Promise<void> {
  await db.syncQueue.add({
    id: uuidv4(),
    table,
    action,
    data,
    timestamp: Date.now(),
  });
}

export function getSyncStatus(): Promise<{
  pendingChanges: number;
}> {
  return db.syncQueue.count().then((count) => ({
    pendingChanges: count,
  }));
}
