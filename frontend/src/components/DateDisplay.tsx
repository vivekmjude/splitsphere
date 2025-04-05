"use client";
import { formatDate } from "@/lib/utils";

export default function DateDisplay({ date }: { date: string }) {
  return <span>{formatDate(date)}</span>;
}
