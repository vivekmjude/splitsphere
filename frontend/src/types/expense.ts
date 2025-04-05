export type Currency = "USD" | "EUR" | "GBP" | "INR"; // Add more as needed

export type SplitType = "EQUAL" | "UNEQUAL" | "PERCENTAGE";

export interface User {
  id: string;
  name: string;
  email: string;
  defaultCurrency: Currency;
}

export interface Payment {
  userId: string;
  amount: number;
}

export interface Settlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
  settledAmount?: number; // Track how much has been paid
  isFullySettled?: boolean; // Flag to quickly check if fully settled
}

export interface SettlementPayment {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: Currency;
  date: string;
  note?: string;
  relatedExpenseIds?: string[]; // Optional reference to expenses this settles
}

export interface Split {
  userId: string;
  amount: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  paidBy: string; // userId of the person who recorded the expense (for backward compatibility)
  payments: Payment[]; // New field to track who paid how much
  splits: Split[];
  settlements: Settlement[]; // New field to track who owes whom
  date: string;
  splitType: SplitType;
  groupId?: string; // Optional group ID for group expenses
  description?: string;
}
