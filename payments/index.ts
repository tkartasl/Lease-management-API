import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import paymentService from "../src/application/payment-service";
import { apiKeyAuth } from '../src/lib/api-key-middleware';

const registerPayment: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const payment = req.body;
  if (!payment) {
    context.res = {
      status: 400,
      body: { error: "Payment data required" }
    };
    return;
  }

  const response = paymentService(payment);
  if (response.status === 400) {
    context.bindings.invalidPayment = response.body
  }
  context.res = {
    status: response.status,
    body: response.body,
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

export default apiKeyAuth(registerPayment);