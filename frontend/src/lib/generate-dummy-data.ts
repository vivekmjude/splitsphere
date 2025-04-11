import {
  Expense,
  Split,
  SplitType,
  User,
  Currency,
  Payment,
} from "@/types/expense";
import { Group } from "@/types/group";
import { db } from "@/lib/db";
import { calculateSettlements } from "@/lib/splitCalculator";

// Helper function to generate a unique ID
const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// Helper function to get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random date within last 6 months
const getRandomDate = (startDate?: Date, endDate?: Date): string => {
  const start = startDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 months ago
  const end = endDate || new Date();

  const randomTimestamp =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const date = new Date(randomTimestamp);

  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

// Helper function to generate random amount between min and max
const getRandomAmount = (min: number, max: number): number => {
  return Number((min + Math.random() * (max - min)).toFixed(2));
};

// Expense name generator
const expenseCategories = {
  Food: [
    "Lunch",
    "Dinner",
    "Breakfast",
    "Groceries",
    "Coffee",
    "Snacks",
    "Restaurant",
    "Takeout",
    "Cafe",
  ],
  Transportation: [
    "Uber",
    "Taxi",
    "Gas",
    "Parking",
    "Car rental",
    "Public transit",
    "Train tickets",
    "Bus fare",
  ],
  Entertainment: [
    "Movie tickets",
    "Concert",
    "Theater",
    "Museum",
    "Amusement park",
    "Bowling",
    "Arcade",
  ],
  Travel: [
    "Hotel",
    "Flight",
    "Airbnb",
    "Travel insurance",
    "Baggage fees",
    "Airport food",
    "Souvenirs",
  ],
  Utilities: [
    "Electricity",
    "Water",
    "Internet",
    "Phone bill",
    "Streaming services",
    "Gas bill",
  ],
  Rent: [
    "Rent",
    "Security deposit",
    "Moving expenses",
    "Furniture",
    "Home repairs",
  ],
  Other: [
    "Gift",
    "Clothes",
    "Charity",
    "Subscription",
    "Education",
    "Medical",
    "Fitness",
    "Electronics",
  ],
};

const generateExpenseName = (): string => {
  const category = getRandomItem(Object.keys(expenseCategories));
  const item = getRandomItem(
    expenseCategories[category as keyof typeof expenseCategories]
  );
  return `${item}`;
};

// Generate equal splits
const generateEqualSplits = (members: User[], amount: number): Split[] => {
  const splitAmount = Number((amount / members.length).toFixed(2));

  // Handle rounding errors by adding the remainder to the first person
  const totalSplitAmount = splitAmount * members.length;
  const remainder = amount - totalSplitAmount;

  return members.map((member, index) => ({
    userId: member.id,
    amount: index === 0 ? splitAmount + remainder : splitAmount,
  }));
};

// Generate unequal splits
const generateUnequalSplits = (members: User[], amount: number): Split[] => {
  // Generate random percentages that sum to 100
  let remainingPercentage = 100;
  const percentages: number[] = [];

  for (let i = 0; i < members.length - 1; i++) {
    // For all but the last member, assign a random percentage
    const maxPercent = Math.floor(remainingPercentage * 0.8); // Don't use more than 80% of what's left
    const percent = Math.max(5, Math.floor(Math.random() * maxPercent)); // Ensure at least 5%
    percentages.push(percent);
    remainingPercentage -= percent;
  }

  // Last member gets whatever is left
  percentages.push(remainingPercentage);

  // Create splits based on these percentages
  return members.map((member, index) => {
    const splitAmount = Number(
      ((percentages[index] / 100) * amount).toFixed(2)
    );
    return {
      userId: member.id,
      amount: splitAmount,
    };
  });
};

// Generate percentage splits
const generatePercentageSplits = (members: User[], amount: number): Split[] => {
  // Generate random percentages that sum to 100
  let remainingPercentage = 100;
  const percentages: number[] = [];

  for (let i = 0; i < members.length - 1; i++) {
    // For all but the last member, assign a random percentage
    const maxPercent = Math.floor(remainingPercentage * 0.8); // Don't use more than 80% of what's left
    const percent = Math.max(5, Math.floor(Math.random() * maxPercent)); // Ensure at least 5%
    percentages.push(percent);
    remainingPercentage -= percent;
  }

  // Last member gets whatever is left
  percentages.push(remainingPercentage);

  // Create splits based on these percentages
  return members.map((member, index) => {
    const splitAmount = Number(
      ((percentages[index] / 100) * amount).toFixed(2)
    );
    return {
      userId: member.id,
      amount: splitAmount,
      percentage: percentages[index],
    };
  });
};

// Generate payments - who paid for the expense
const generatePayments = (
  members: User[],
  amount: number,
  paidById: string
): Payment[] => {
  // Decide if this will be a single-payer or multi-payer expense
  const isMultiPayer = Math.random() < 0.2; // 20% chance for multi-payer

  if (!isMultiPayer) {
    // Single payer (most common case)
    return [{ userId: paidById, amount }];
  } else {
    // Multiple payers (less common)
    // Randomly select 2-3 payers (or less if there aren't enough members)
    const numPayers = Math.min(
      Math.floor(Math.random() * 2) + 2,
      members.length
    );

    // Ensure the paidById is always one of the payers
    const selectedPayerIds = new Set([paidById]);

    // Add other random payers
    const otherMembers = members.filter((m) => m.id !== paidById);
    while (selectedPayerIds.size < numPayers && otherMembers.length > 0) {
      const randomMember = getRandomItem(otherMembers);
      selectedPayerIds.add(randomMember.id);
      otherMembers.splice(otherMembers.indexOf(randomMember), 1);
    }

    // Generate payment amounts that sum to the total
    const payerIds = Array.from(selectedPayerIds);
    let remainingAmount = amount;
    const payments: Payment[] = [];

    // The main payer should pay more
    const mainPayerShare = Math.max(0.5, 0.7 + Math.random() * 0.2); // 50-90% for main payer
    const mainPayerAmount = Number((amount * mainPayerShare).toFixed(2));
    payments.push({ userId: paidById, amount: mainPayerAmount });
    remainingAmount -= mainPayerAmount;

    // Distribute the rest among other payers
    const otherPayers = payerIds.filter((id) => id !== paidById);
    if (otherPayers.length > 0) {
      for (let i = 0; i < otherPayers.length - 1; i++) {
        const maxAmount = remainingAmount * 0.8;
        const paymentAmount = Number((Math.random() * maxAmount).toFixed(2));
        payments.push({ userId: otherPayers[i], amount: paymentAmount });
        remainingAmount -= paymentAmount;
      }

      // Last payer gets the remainder
      if (otherPayers.length > 0) {
        const lastPayerId = otherPayers[otherPayers.length - 1];
        payments.push({
          userId: lastPayerId,
          amount: Number(remainingAmount.toFixed(2)),
        });
      }
    }

    return payments;
  }
};

// Function to generate a random expense for a group
const generateGroupExpense = (group: Group): Expense => {
  const amount = getRandomAmount(10, 200);
  const paidBy = getRandomItem(group.members).id;
  const splitType = getRandomItem<SplitType>([
    "EQUAL",
    "UNEQUAL",
    "PERCENTAGE",
  ]);

  let splits: Split[];
  switch (splitType) {
    case "EQUAL":
      splits = generateEqualSplits(group.members, amount);
      break;
    case "UNEQUAL":
      splits = generateUnequalSplits(group.members, amount);
      break;
    case "PERCENTAGE":
      splits = generatePercentageSplits(group.members, amount);
      break;
  }

  // Generate payments
  const payments = generatePayments(group.members, amount, paidBy);

  // Calculate settlements
  const settlements = calculateSettlements({
    payments,
    splits,
  });

  return {
    id: generateUniqueId("expense"),
    name: generateExpenseName(),
    amount,
    currency: group.currency as Currency,
    paidBy,
    payments,
    splits,
    settlements,
    date: getRandomDate(),
    splitType,
    groupId: group.id,
    description:
      Math.random() > 0.5
        ? `${group.name} - ${generateExpenseName()}`
        : undefined,
  };
};

// Function to generate a random expense between friends (no group)
const generateFriendExpense = (currentUser: User, friends: User[]): Expense => {
  const amount = getRandomAmount(5, 100);

  // Randomly select between 1-3 friends to share the expense with
  const numFriends = Math.min(
    Math.floor(Math.random() * 3) + 1,
    friends.length
  );
  const selectedFriends = [...friends]
    .sort(() => 0.5 - Math.random())
    .slice(0, numFriends);

  // Add current user to participants
  const participants = [currentUser, ...selectedFriends];

  // Randomly decide who paid
  const paidBy = getRandomItem(participants).id;

  const splitType = getRandomItem<SplitType>([
    "EQUAL",
    "UNEQUAL",
    "PERCENTAGE",
  ]);

  let splits: Split[];
  switch (splitType) {
    case "EQUAL":
      splits = generateEqualSplits(participants, amount);
      break;
    case "UNEQUAL":
      splits = generateUnequalSplits(participants, amount);
      break;
    case "PERCENTAGE":
      splits = generatePercentageSplits(participants, amount);
      break;
  }

  // Generate payments
  const payments = generatePayments(participants, amount, paidBy);

  // Calculate settlements
  const settlements = calculateSettlements({
    payments,
    splits,
  });

  return {
    id: generateUniqueId("expense"),
    name: generateExpenseName(),
    amount,
    currency: currentUser.defaultCurrency,
    paidBy,
    payments,
    splits,
    settlements,
    date: getRandomDate(),
    splitType,
    description:
      Math.random() > 0.7
        ? `Expense with friends - ${generateExpenseName()}`
        : undefined,
  };
};

// Main function to generate and add dummy data
export async function generateAndAddDummyData(
  numGroupExpenses: number = 50,
  numFriendExpenses: number = 30
): Promise<number> {
  try {
    // Get current data
    const groups = await db.groups.toArray();
    const currentUser = (await db.user.toArray())[0];

    // Get accepted friends
    const friends = (await db.friends.toArray())
      .filter((friend) => friend.status === "ACCEPTED")
      .map((friend) => ({
        id: friend.id,
        name: friend.name,
        email: friend.email,
        defaultCurrency: friend.defaultCurrency || "USD",
      }));

    if (!currentUser) {
      throw new Error("No current user found");
    }

    if (groups.length === 0) {
      throw new Error("No groups found to generate expenses for");
    }

    console.log(
      `Generating ${numGroupExpenses} group expenses and ${numFriendExpenses} friend expenses...`
    );

    // Generate expenses for each group
    const groupExpenses: Expense[] = [];
    for (let i = 0; i < numGroupExpenses; i++) {
      const group = getRandomItem(groups);
      groupExpenses.push(generateGroupExpense(group));
    }

    // Generate expenses for friends (no group)
    const friendExpenses: Expense[] = [];
    if (friends.length > 0) {
      for (let i = 0; i < numFriendExpenses; i++) {
        friendExpenses.push(generateFriendExpense(currentUser, friends));
      }
    }

    const allExpenses = [...groupExpenses, ...friendExpenses];
    console.log(`Generated ${allExpenses.length} total expenses`);

    // Add expenses to IndexedDB
    for (const expense of allExpenses) {
      await db.expenses.add({
        ...expense,
        _synced: true,
        _lastModified: Date.now(),
      });
    }

    console.log(
      `Successfully added ${allExpenses.length} expenses to IndexedDB`
    );
    return allExpenses.length;
  } catch (error) {
    console.error("Failed to generate and add dummy data:", error);
    throw error;
  }
}
