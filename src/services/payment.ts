import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types';

const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN_MERCADOPAGO as string,
});

interface MercadoPagoRequest {
  transaction_amount: number;
  token: string;
  //description: body.description,
  installments: number;
  payment_method_id: string;
  issuer_id: number;
  payer: {
    email: string;
  };
}

export async function processPayment(paymentData: PaymentCreateRequest) {
  try {
    const payment = new Payment(client);
    const idempotencyKey = crypto.randomUUID();

    const paymentRes = payment.create({
      body: paymentData,
      requestOptions: {
        idempotencyKey,
      },
    });

    return { success: true, data: paymentRes };
  } catch (e: any) {
    console.log('Error from Payment: ', e);
    return { success: false, error: e.message };
  }
}
