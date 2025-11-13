import * as z from "zod";
import leaseService from "../application/lease-service";

export type Money = number;

export type LeaseInput = {
  companyId: string;
  itemId: string;
  price: Money;
  termMonths: number;
  nominalRatePct: number;
  startDate: string; // ISO date
  upfrontFee: Money;
  monthlyFee: Money;
};

export type Lease = LeaseInput & {
  id: string;
  createdAt: string;
  schedule: Installment[];
  totals: { 
    totalPayments: Money; 
    totalInterest: Money;
    totalFees: Money
  };
};

export type Installment = {
  id: string;
  period: number;
  dueDate: string;
  payment: Money;
  interest: Money;
  principal: Money;
  amountPaid: Money;
  balance: Money;
  lateInterest: Money;
  fee: Money;
  balanceAfter: Money;
  paid: Boolean;
};

export const leaseInputSchema = z.object({
  companyId: z.string(),
  itemId: z.string(),
  price: z.number().nonnegative(),
  termMonths: z.number().int().positive(),
  nominalRatePct: z.number().nonnegative(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO date format" }), // ISO date
  upfrontFee: z.number().nonnegative(),
  monthlyFee: z.number().nonnegative(),
});

export const YEAR = 12;

export const calculateMonthlyPayment = function(monthlyRate: number, leaseInput: LeaseInput): number {
   const payment = monthlyRate === 0
  ? leaseInput.price / leaseInput.termMonths
  : (leaseInput.price * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -leaseInput.termMonths));

  return payment;
};

export const round = (n: number) => Math.round(n * 100) / 100;

export const createSchedule = function(monthlyPayment: number, monthlyRate: number, leaseInput: LeaseInput): Installment[] {
  let balance = leaseInput.price;
  const schedule: Installment[] = [];

  for (let i = 1; i <= leaseInput.termMonths; i++) {
    const interest = round(balance * monthlyRate);
    const principal = round(monthlyPayment - interest);
    balance = round(balance - principal);

    const dueDate = new Date(leaseInput.startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      id: crypto.randomUUID(),
      period: i,
      dueDate: dueDate.toISOString(),
      payment: round(monthlyPayment + leaseInput.monthlyFee),
      interest,
      principal,
      amountPaid: 0,
      balance: round(monthlyPayment + leaseInput.monthlyFee),
      lateInterest: 0,
      fee: leaseInput.monthlyFee,
      balanceAfter: Math.max(balance, 0),
      paid: false
    });
  }
  return schedule;
};

export const newLeaseFromInput = function(leaseInput: LeaseInput): Lease {
  const monthlyRate = leaseInput.nominalRatePct / 100 / YEAR;
  const monthlyPayment = calculateMonthlyPayment(monthlyRate, leaseInput);
  const schedule = createSchedule(monthlyPayment, monthlyRate, leaseInput);

  return {
    ...leaseInput,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    schedule,
    totals: {
      totalPayments: leaseInput.upfrontFee,
      totalInterest: 0,
      totalFees: leaseInput.upfrontFee,
    },
  };
};