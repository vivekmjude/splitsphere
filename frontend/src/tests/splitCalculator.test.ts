import { expect, test, describe } from "bun:test";
import {
  calculateSplits,
  recalculateSplitsOnAmountChange,
  calculateSettlements,
} from "@/lib/splitCalculator";
import { Split, Payment, User, Currency } from "@/types/expense";

describe("Split Calculator", () => {
  const testUsers: User[] = [
    {
      id: "user1",
      name: "User 1",
      email: "user1@example.com",
      defaultCurrency: "USD" as Currency,
    },
    {
      id: "user2",
      name: "User 2",
      email: "user2@example.com",
      defaultCurrency: "USD" as Currency,
    },
    {
      id: "user3",
      name: "User 3",
      email: "user3@example.com",
      defaultCurrency: "USD" as Currency,
    },
  ];

  describe("calculateSplits", () => {
    test("should calculate equal splits correctly", () => {
      const result = calculateSplits({
        amount: 300,
        splitType: "EQUAL",
        participants: testUsers,
      });

      expect(result.length).toBe(3);
      expect(result[0].amount).toBe(100);
      expect(result[1].amount).toBe(100);
      expect(result[2].amount).toBe(100);
    });

    test("should handle a single participant correctly", () => {
      const result = calculateSplits({
        amount: 150,
        splitType: "EQUAL",
        participants: [testUsers[0]],
      });

      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(150);
      expect(result[0].userId).toBe("user1");
    });

    test("should calculate unequal splits correctly", () => {
      const result = calculateSplits({
        amount: 300,
        splitType: "UNEQUAL",
        participants: testUsers,
        customSplits: {
          user1: 100,
          user2: 150,
          user3: 50,
        },
      });

      expect(result.length).toBe(3);
      expect(result.find((s) => s.userId === "user1")?.amount).toBe(100);
      expect(result.find((s) => s.userId === "user2")?.amount).toBe(150);
      expect(result.find((s) => s.userId === "user3")?.amount).toBe(50);
    });

    test("should calculate percentage splits correctly", () => {
      const result = calculateSplits({
        amount: 1000,
        splitType: "PERCENTAGE",
        participants: testUsers,
        customSplits: {
          user1: 25,
          user2: 50,
          user3: 25,
        },
      });

      expect(result.length).toBe(3);
      expect(result.find((s) => s.userId === "user1")?.amount).toBe(250);
      expect(result.find((s) => s.userId === "user2")?.amount).toBe(500);
      expect(result.find((s) => s.userId === "user3")?.amount).toBe(250);
    });
  });

  describe("recalculateSplitsOnAmountChange", () => {
    test("should recalculate equal splits correctly", () => {
      const oldSplits: Split[] = [
        { userId: "user1", amount: 100 },
        { userId: "user2", amount: 100 },
        { userId: "user3", amount: 100 },
      ];

      const result = recalculateSplitsOnAmountChange({
        oldAmount: 300,
        newAmount: 600,
        oldSplits,
        splitType: "EQUAL",
      });

      expect(result.length).toBe(3);
      expect(result[0].amount).toBe(200);
      expect(result[1].amount).toBe(200);
      expect(result[2].amount).toBe(200);
    });

    test("should recalculate percentage splits correctly", () => {
      const oldSplits: Split[] = [
        { userId: "user1", amount: 100, percentage: 25 },
        { userId: "user2", amount: 200, percentage: 50 },
        { userId: "user3", amount: 100, percentage: 25 },
      ];

      const result = recalculateSplitsOnAmountChange({
        oldAmount: 400,
        newAmount: 1000,
        oldSplits,
        splitType: "PERCENTAGE",
      });

      expect(result.length).toBe(3);
      expect(result.find((s) => s.userId === "user1")?.amount).toBe(250);
      expect(result.find((s) => s.userId === "user2")?.amount).toBe(500);
      expect(result.find((s) => s.userId === "user3")?.amount).toBe(250);
    });

    test("should recalculate unequal splits correctly", () => {
      const oldSplits: Split[] = [
        { userId: "user1", amount: 50 },
        { userId: "user2", amount: 100 },
        { userId: "user3", amount: 150 },
      ];

      const result = recalculateSplitsOnAmountChange({
        oldAmount: 300,
        newAmount: 600,
        oldSplits,
        splitType: "UNEQUAL",
      });

      expect(result.length).toBe(3);
      expect(result.find((s) => s.userId === "user1")?.amount).toBe(100);
      expect(result.find((s) => s.userId === "user2")?.amount).toBe(200);
      expect(result.find((s) => s.userId === "user3")?.amount).toBe(300);
    });
  });

  describe("calculateSettlements", () => {
    test("should calculate settlements correctly", () => {
      const payments: Payment[] = [{ userId: "user1", amount: 300 }];

      const splits: Split[] = [
        { userId: "user1", amount: 100 },
        { userId: "user2", amount: 100 },
        { userId: "user3", amount: 100 },
      ];

      const result = calculateSettlements({ payments, splits });

      expect(result.length).toBe(2);
      expect(result.find((s) => s.fromUserId === "user2")?.toUserId).toBe(
        "user1"
      );
      expect(result.find((s) => s.fromUserId === "user2")?.amount).toBe(100);
      expect(result.find((s) => s.fromUserId === "user3")?.toUserId).toBe(
        "user1"
      );
      expect(result.find((s) => s.fromUserId === "user3")?.amount).toBe(100);
    });

    test("should handle empty payments", () => {
      const payments: Payment[] = [];
      const splits: Split[] = [
        { userId: "user1", amount: 100 },
        { userId: "user2", amount: 100 },
      ];

      const result = calculateSettlements({ payments, splits });
      expect(result.length).toBe(0);
    });

    test("should handle multiple payers", () => {
      const payments: Payment[] = [
        { userId: "user1", amount: 200 },
        { userId: "user2", amount: 100 },
      ];

      const splits: Split[] = [
        { userId: "user1", amount: 100 },
        { userId: "user2", amount: 100 },
        { userId: "user3", amount: 100 },
      ];

      const result = calculateSettlements({ payments, splits });

      expect(result.length).toBe(1);
      expect(result[0].fromUserId).toBe("user3");
      expect(result[0].toUserId).toBe("user1");
      expect(result[0].amount).toBe(100);
    });
  });
});
