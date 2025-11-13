import { AzureFunction, Context } from "@azure/functions"
import { calculateLateInterest } from "../src/domain/payment";
import { round } from "../src/domain/lease";
import { InvalidPayment } from "../src/domain/payment";
import { recordPayment } from "../src/handlers/payment/record-payment";

const invalidPaymentTrigger: AzureFunction = async function (context: Context, invalidPayment: InvalidPayment): Promise<void> {
  const { lease, daysLate, payment, installment } = invalidPayment;

  if (installment.balance > 0) {
    if (installment.balance < 0) {
      context.log(`Lease contract's ${lease.id} payment ${payment.id} is still missing ${installment.balance} euros`);
    }
  }

  if (daysLate > 0) {
    const balance = installment.balance > 0 ? installment.balance : installment.payment;
    const lateInterest = calculateLateInterest(balance, lease.nominalRatePct, daysLate);
    
    lease.totals.totalInterest += lateInterest;
    lease.schedule = lease.schedule.map(i =>
      i.period === installment.period ? { ...i, lateInterest: lateInterest } : i
    );
    recordPayment(payment, lease, installment);
    context.log(`Lease contract's ${lease.id} payment ${payment.id} is ${daysLate} late and get's ${round(lateInterest)} euros of additional interests`)
  }
};

export default invalidPaymentTrigger;