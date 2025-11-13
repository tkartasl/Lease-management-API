import { validatePaymentData } from '../../../src/domain/payment';
import { createLeaseInput } from './createSchedule.test';
import { newLeaseFromInput } from '../../../src/domain/lease';

const now = new Date();

const testLease = {
  ...newLeaseFromInput(createLeaseInput()),
  schedule: [
    {
      id: "1",
      period: 1,
      dueDate: now.toISOString(),
      payment: 100,
      interest: 0,
      principal: 100,
      amountPaid: 0,
      balance: 100,
      lateInterest: 0,
      fee: 0,
      balanceAfter: 1000,
      paid: false
    }
  ]
};

describe("validatePaymentData", () => {
  it("Should return status Valid", () => {
    const payment = {
      id: "",
      installmentId: "1",
      leaseId: testLease.id,
      paidAt: now.toISOString(),
      amount: 100
     };

    const result = validatePaymentData(payment, testLease);

    expect(result.isValid).toEqual(true);
  });

  it("Should return status Valid, but with negative balance", () => {
    const payment = {
      id: "",
      installmentId: "1",
      leaseId: testLease.id,
      paidAt: now.toISOString(),
      amount: 1000
     };

    const result = validatePaymentData(payment, testLease);

    expect(result.isValid).toEqual(true);
    expect(result.installment?.balance === -900);
  });

  it("Payment is late, should return status Invalid", () => {
    const latePayment = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const payment = {
      id: "",
      installmentId: "1",
      leaseId: testLease.id,
      paidAt: latePayment.toISOString(),
      amount: 100
     };

    const result = validatePaymentData(payment, testLease);

    expect(result.isValid).toEqual(false);
    expect(result.message).toEqual(`Payment is 1 days late.`);
  });

  it("Amount is less than payment, should return status Invalid", () => {
    const payment = {
      id: "",
      installmentId: "1",
      leaseId: testLease.id,
      paidAt: now.toISOString(),
      amount: 90
     };

     testLease.schedule[0].balance = 100;

    const result = validatePaymentData(payment, testLease);

    expect(result.isValid).toEqual(false);
    expect(result.installment?.balance).toEqual(10);
    expect(result.message).toEqual(`Paid amount ${payment.amount} differs from monthly payment of ${testLease.schedule[0].payment.toFixed(2)}`)
  });
});