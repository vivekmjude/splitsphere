import { User } from "./expense";

export interface Friend extends User {
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  addedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: User[];
  createdAt: string;
  createdBy: string; // userId
  totalBalance: number;
  currency: string;
} 