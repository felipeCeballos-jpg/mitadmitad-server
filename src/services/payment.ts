import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.ACCESS_TOKEN_MERCADOPAGO as string,
});

export async function processPayment(paymentData: any) {
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
