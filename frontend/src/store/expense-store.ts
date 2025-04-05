import { create } from "zustand";
import { Expense, User, Payment, Settlement } from "@/types/expense";
import { db, addToSyncQueue } from "@/lib/db";
import { calculateSettlements } from "@/lib/splitCalculator";

interface ExpenseState {
  expenses: Expense[];
  currentUser: User;
  connectedUsers: User[];
  isLoading: boolean;
  addExpense: (expense: Expense) => Promise<void>;
  editExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  loadExpenses: () => Promise<void>;
  refreshExpense: (expenseId: string) => Promise<Expense | null>;
  syncPendingChanges: () => Promise<void>;
  getUserById: (userId: string) => User;
}

// Mock current user and connected users
const mockCurrentUser: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com",
  defaultCurrency: "USD",
};

const mockConnectedUsers: User[] = [
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    defaultCurrency: "USD",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    defaultCurrency: "EUR",
  },
];

// Update mock expenses data to include payments and settlements
const dummyExpenses: Expense[] = [
  {
    id: "expense-1",
    name: "Dinner at Restaurant",
    amount: 100,
    currency: "USD",
    paidBy: "1",
    payments: [{ userId: "1", amount: 100 }],
    splits: [
      { userId: "1", amount: 50 },
      { userId: "2", amount: 50 },
    ],
    settlements: [{ fromUserId: "2", toUserId: "1", amount: 50 }],
    date: "2024-03-20",
    splitType: "EQUAL",
  },
  {
    id: "expense-2",
    name: "Movie Night",
    amount: 60,
    currency: "USD",
    paidBy: "1",
    payments: [{ userId: "1", amount: 60 }],
    splits: [
      { userId: "1", amount: 20 },
      { userId: "2", amount: 20 },
      { userId: "3", amount: 20 },
    ],
    settlements: [
      { fromUserId: "2", toUserId: "1", amount: 20 },
      { fromUserId: "3", toUserId: "1", amount: 20 },
    ],
    date: "2024-03-19",
    splitType: "EQUAL",
    groupId: "group-1",
  },
  {
    id: "expense-3",
    name: "Groceries",
    amount: 85.5,
    currency: "USD",
    paidBy: "2",
    payments: [{ userId: "2", amount: 85.5 }],
    splits: [
      { userId: "1", amount: 42.75 },
      { userId: "2", amount: 42.75 },
    ],
    settlements: [{ fromUserId: "1", toUserId: "2", amount: 42.75 }],
    date: "2024-03-22",
    splitType: "EQUAL",
  },
];

// Helper function to generate a unique ID
const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// Helper function to process expense data before adding/updating
const processExpenseData = (expense: Expense): Expense => {
  // Ensure the expense has payments
  if (!expense.payments || expense.payments.length === 0) {
    // If no payments are defined, create one with the paidBy user paying the full amount
    expense.payments = [{ userId: expense.paidBy, amount: expense.amount }];
  }

  // Store original settlement status
  const originalSettlements = expense.settlements || [];

  // Calculate settlements based on payments and splits
  const newSettlements = calculateSettlements({
    payments: expense.payments,
    splits: expense.splits,
  });

  // Preserve settlement status (isFullySettled and settledAmount) from original settlements
  const mergedSettlements = newSettlements.map((newSettlement) => {
    // Try to find matching original settlement
    const originalSettlement = originalSettlements.find(
      (s) =>
        s.fromUserId === newSettlement.fromUserId &&
        s.toUserId === newSettlement.toUserId
    );

    if (originalSettlement) {
      // If we found a matching settlement, preserve its status properties
      return {
        ...newSettlement,
        settledAmount: originalSettlement.settledAmount,
        isFullySettled: originalSettlement.isFullySettled,
      };
    }

    return newSettlement;
  });

  expense.settlements = mergedSettlements;
  return expense;
};

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  currentUser: mockCurrentUser,
  connectedUsers: mockConnectedUsers,
  isLoading: false,

  // Add getUserById function
  getUserById: (userId: string) => {
    const { currentUser, connectedUsers } = get();

    // Check if it's the current user
    if (userId === currentUser.id) {
      return currentUser;
    }

    // Check connected users
    const user = connectedUsers.find((u) => u.id === userId);
    if (user) {
      return user;
    }

    // If user not found, return a placeholder user to avoid errors
    console.warn(`User with ID ${userId} not found, returning placeholder`);
    return {
      id: userId,
      name: `User ${userId}`,
      email: "",
      defaultCurrency: "USD",
    };
  },

  loadExpenses: async () => {
    set({ isLoading: true });
    try {
      // Initialize user data in IndexedDB if not already set
      const userCount = await db.user.count();
      if (userCount === 0) {
        await db.user.add(mockCurrentUser);
      }

      // Check if we need to load dummy expenses
      const expensesCount = await db.expenses.count();
      if (expensesCount === 0) {
        console.log("Loading dummy expenses into IndexedDB...");
        // Add dummy expenses
        for (const expense of dummyExpenses) {
          await db.expenses.add({
            ...expense,
            _synced: true,
            _lastModified: Date.now(),
          });
        }
      }

      // Load expenses from IndexedDB
      const expenses = await db.expenses.toArray();
      set({ expenses, isLoading: false });
    } catch (error) {
      console.error("Failed to load expenses:", error);
      set({ isLoading: false });
    }
  },

  addExpense: async (expense) => {
    try {
      // Generate a unique ID if not provided
      let uniqueId = expense.id || generateUniqueId("expense");

      // Ensure the ID is truly unique
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        // Check if an expense with this ID already exists
        const existingExpense = await db.expenses.get(uniqueId);

        if (existingExpense) {
          // ID collision detected, generate a new ID
          console.log(
            `ID collision detected for ${uniqueId}, generating new ID...`
          );
          uniqueId = generateUniqueId("expense");
          attempts++;
        } else {
          isUnique = true;
        }
      }

      if (!isUnique) {
        throw new Error(
          "Failed to generate a unique expense ID after multiple attempts"
        );
      }

      // Create the expense with the unique ID
      let expenseToAdd: Expense = {
        ...expense,
        id: uniqueId,
      };

      // Process the expense data (calculate settlements, etc.)
      expenseToAdd = processExpenseData(expenseToAdd);

      // Add to IndexedDB with sync metadata
      const expenseWithMeta = {
        ...expenseToAdd,
        _synced: false,
        _lastModified: Date.now(),
      };

      await db.expenses.add(expenseWithMeta);

      // Add to sync queue
      await addToSyncQueue(
        "expenses",
        "add",
        expenseToAdd as unknown as Record<string, unknown>
      );

      // Update state
      set((state) => ({
        expenses: [...state.expenses, expenseToAdd],
      }));
    } catch (error) {
      console.error("Failed to add expense:", error);
      throw error;
    }
  },

  editExpense: async (expenseId: string, updates: Partial<Expense>) => {
    try {
      // Get the existing expense
      const existingExpense = await db.expenses.get(expenseId);
      if (!existingExpense) {
        throw new Error("Expense not found");
      }

      // Update expense data
      let updatedExpense: Expense = {
        ...existingExpense,
        ...updates,
      };

      // Process the expense data (calculate settlements, etc.)
      updatedExpense = processExpenseData(updatedExpense);

      // Update in IndexedDB with sync metadata
      const expenseWithMeta = {
        ...updatedExpense,
        _synced: false,
        _lastModified: Date.now(),
      };

      await db.expenses.put(expenseWithMeta);

      // Add to sync queue
      const syncData = {
        ...updatedExpense,
      };
      await addToSyncQueue(
        "expenses",
        "update",
        syncData as unknown as Record<string, unknown>
      );

      // Update state
      set((state) => ({
        expenses: state.expenses.map((expense) =>
          expense.id === expenseId ? updatedExpense : expense
        ),
      }));
    } catch (error) {
      console.error("Failed to edit expense:", error);
      throw error;
    }
  },

  deleteExpense: async (expenseId: string) => {
    try {
      // Delete from IndexedDB
      await db.expenses.delete(expenseId);

      // Add to sync queue
      await addToSyncQueue("expenses", "delete", {
        id: expenseId,
      } as unknown as Record<string, unknown>);

      // Update state
      set((state) => ({
        expenses: state.expenses.filter((expense) => expense.id !== expenseId),
      }));
    } catch (error) {
      console.error("Failed to delete expense:", error);
      throw error;
    }
  },

  refreshExpense: async (expenseId: string): Promise<Expense | null> => {
    try {
      // Get the existing expense
      const existingExpense = await db.expenses.get(expenseId);
      if (!existingExpense) {
        throw new Error("Expense not found");
      }

      console.log(
        "Refreshing expense, original settlements:",
        existingExpense.settlements
      );

      // Process the expense data (calculate settlements, etc.)
      const refreshedExpense = processExpenseData(existingExpense);

      console.log(
        "Expense after processing, updated settlements:",
        refreshedExpense.settlements
      );

      // Update in IndexedDB with sync metadata
      const expenseWithMeta = {
        ...refreshedExpense,
        _synced: false,
        _lastModified: Date.now(),
      };

      await db.expenses.put(expenseWithMeta);

      // Update state
      set((state) => ({
        expenses: state.expenses.map((expense) =>
          expense.id === expenseId ? refreshedExpense : expense
        ),
      }));

      console.log("Expense state updated with refreshed data");
      return refreshedExpense;
    } catch (error) {
      console.error("Failed to refresh expense:", error);
      return null;
    }
  },

  syncPendingChanges: async () => {
    // This is a placeholder for manually triggering sync
    // The actual sync logic is in the sync.ts file
    const { syncWithBackend } = await import("@/lib/sync");
    await syncWithBackend();
  },
}));
