import { validatePaymentData, type Payment } from "../domain/payment";
import { validatePayment } from "../lib/validation";
import { recordPayment } from "../handlers/payment/record-payment";
import { getLeaseById } from "../persistence/lease-repository";

const paymentService = function(payment: Payment) {
  const result = validatePayment(payment);
  
  if (!result.success) {
    return {
      status: 400,
      body: result.error
    };
  }
  
  const lease = getLeaseById(result.data.leaseId);
  
  if (!lease) {
    return {
      status: 404,
      body: { error: "No lease contract found with this id" }
    };
  }

  const validation = validatePaymentData(payment, lease);
  
  if (validation.installment === null) {
    return {
      status: 404,
      body: { error: "No installment found with this id" }
    };
  } else if (!validation.isValid) {
    return {
      status: 400,
      body: {
        message: validation.message,
        daysLate: validation.daysLate,
        lease: lease,
        payment: payment,
        installment: validation.installment
      }
    };
  }
  
  const remainingBalance = recordPayment(result.data, lease, validation.installment);
  
  return {
    status: 200,
    body: { message: remainingBalance }
  };
}

export default paymentService;