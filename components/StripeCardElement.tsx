import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

const stripePromise = loadStripe('pk_live_51TeaiqHkD2Xnspp74CohUTMOZW3QoqnldajIHwGZYkp5TfBUNL6fUlgxGLnSUpggOWz8Vxcgqnhpm8EHRDeLwdLl00gpgfXpg6');

export default function StripeCardElement() {
  const [stripe, setStripe] = useState<any>(null);

  useEffect(() => {
    stripePromise.then((s) => {
      if (s) setStripe(s);
    });
  }, []);

  if (!stripe) {
    return <div>Loading Stripe...</div>;
  }

  return (
    <div style={{ padding: '12px', background: '#F0EEE9', borderRadius: '8px' }}>
      <div id="card-element" style={{ minHeight: '50px' }}></div>
    </div>
  );
}
