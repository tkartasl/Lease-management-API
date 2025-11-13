import type { Lease, Money } from "./lease.ts"
import * as z from "zod";
import { Installment } from "./lease";
import { round } from "./lease";

export type Payment = {
  id: string;
  installmentId: string,
  leaseId: string;
  paidAt: string;
  amount: Money;
};

export interface InvalidPayment {
  lease: Lease;
  daysLate: number;
  payment: Payment;
  installment: Installment;
};

export const paymentSchema = z.object({
  id: z.string(),
  installmentId: z.string(),
  leaseId: z.string(),
  paidAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO date format" }),
  amount: z.number().nonnegative(),
});

export type Validation = {
  isValid: boolean,
  message: string,
  daysLate: number,
  installment: Installment | null
};

export const calculateLateInterest = function(balance: number, annualRatePct: number, daysLate: number): number {
  if (daysLate <= 0) return 0;

  const dailyRate = annualRatePct / 100 / 365;
  return round(balance * dailyRate * daysLate);
}

export const validatePaymentData = function(payment: Payment, lease: Lease): Validation {
  const installment = lease.schedule.find(i => i.id === payment.installmentId);
  
  if (!installment) {
    return { isValid: false, message: "Can't find installment", daysLate: 0, installment: null };
  } else if (installment.paid) {
    return { isValid: false, message: "Installment is already paid" , daysLate: 0, installment: installment };
  }

  let daysLate = 0;
  let isValid = true;
  const messages: string[] = [];

  const paidAt = new Date(payment.paidAt);
  const dueDate = new Date(installment.dueDate);

  if (paidAt > dueDate) {
    const diffMs = paidAt.getTime() - dueDate.getTime();
    daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    isValid = false;
    messages.push(`Payment is ${daysLate} days late.`);
  }

  if (payment.amount !== installment.balance) {
    if (payment.amount < installment.payment) {
      isValid = false;
      installment.balance = round(installment.balance - payment.amount);
      messages.push(`Paid amount ${payment.amount} differs from monthly payment of ${installment.payment.toFixed(2)}`);
      installment.amountPaid = payment.amount;
    } else {
      installment.balance = round(installment.balance - payment.amount);
      payment.amount = installment.payment;
    }
  }

  return { isValid: isValid, message: messages.join(" "), daysLate: daysLate, installment: installment };
};