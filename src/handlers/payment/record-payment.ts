import { YEAR } from "../../domain/lease";
import type { Payment } from "../../domain/payment";
import { Installment, Lease, round } from "../../domain/lease";
import updateLease from "../../persistence/payment-repository";

export const recordPayment = function(payment: Payment, lease: Lease, installment: Installment): String {
  const monthlyRate = lease.nominalRatePct / 100 / YEAR;
  const interest = round(installment.balanceAfter * monthlyRate);
  
  lease.totals.totalPayments += payment.amount;
  lease.totals.totalInterest += interest;
  lease.totals.totalFees += installment.fee;
  
  const paidStatus = installment.balance <= 0;
  lease.schedule = lease.schedule.map(i =>
    i.period === installment.period ? { ...i, paid: paidStatus, balance: installment.balance } : i
  );

  updateLease(lease);
  return `Remaining balance is ${installment.balanceAfter}`;
}; 