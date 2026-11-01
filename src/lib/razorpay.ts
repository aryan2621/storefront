import { SELLER_NAME } from './site';
import { CheckoutResponse, verifyPayment, VerifyResponse } from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function openRazorpayCheckout(
  checkoutData: CheckoutResponse,
  onSuccess: (result: VerifyResponse) => void,
  onError: (error: string) => void
) {
  if (typeof window.Razorpay === 'undefined') {
    onError('Razorpay SDK failed to load. Please check your internet connection or ad blocker.');
    return;
  }

  const options: Record<string, unknown> = {
    key: checkoutData.key_id,
    amount: checkoutData.amount,
    currency: checkoutData.currency,
    name: SELLER_NAME,
    description: checkoutData.name,
    prefill: checkoutData.prefill,
    theme: {
      color: '#6366f1',
      backdrop_color: '#090a0f',
    },
    modal: {
      ondismiss: function () {
        onError('Checkout closed');
      },
    },
    handler: async function (response: {
      razorpay_payment_id: string;
      razorpay_order_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature: string;
    }) {
      try {
        const verifyResult = await verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        onSuccess(verifyResult);
      } catch (err: any) {
        onError(err.message || 'Payment verification failed');
      }
    },
  };

  if (checkoutData.kind === 'subscription' && checkoutData.subscription_id) {
    options.subscription_id = checkoutData.subscription_id;
  } else {
    options.order_id = checkoutData.razorpay_order_id;
  }

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (resp: any) {
    onError(resp.error?.description || 'Payment failed');
  });
  rzp.open();
}
