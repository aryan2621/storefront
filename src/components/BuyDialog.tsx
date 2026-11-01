import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Product, createCheckout, checkCoupon, fetchPublicConfig } from '../lib/api';
import { formatINR } from '../lib/format';
import { openRazorpayCheckout } from '../lib/razorpay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TurnstileWidget } from './TurnstileWidget';
import { useNavigate } from 'react-router-dom';

interface BuyDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyDialog: React.FC<BuyDialogProps> = ({ product, open, onOpenChange }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    percent_off?: number;
    amount_off_paise?: number;
  } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicConfig().then((c) => setTurnstileSiteKey(c.turnstile_site_key));
  }, []);

  if (!product) return null;

  const basePrice = product.price_paise;
  let discount = 0;
  if (appliedCoupon?.percent_off) discount = Math.round((basePrice * appliedCoupon.percent_off) / 100);
  else if (appliedCoupon?.amount_off_paise) discount = appliedCoupon.amount_off_paise;
  const finalPrice = Math.max(100, basePrice - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    const res = await checkCoupon(product.id, couponCode.trim());
    if (res.valid && res.code) setAppliedCoupon({ ...res, code: res.code });
    else {
      setCouponError(res.error || 'That code is not valid for this product.');
      setAppliedCoupon(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email. Your licence is issued to it.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const checkoutData = await createCheckout({
        product_id: product.id,
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        coupon: appliedCoupon?.code,
        turnstile_token: turnstileToken || undefined,
      });

      openRazorpayCheckout(
        checkoutData,
        (verifyResult) => {
          setLoading(false);
          onOpenChange(false);
          if (verifyResult.licenseKey) {
            navigate(`/success?o=${checkoutData.order_id}&t=${checkoutData.order_token}`, {
              state: { result: verifyResult, orderId: checkoutData.order_id },
            });
          } else if (checkoutData.order_id) {
            navigate(`/success?o=${checkoutData.order_id}&t=${checkoutData.order_token}`);
          } else {
            navigate('/success', { state: { result: verifyResult } });
          }
        },
        (err) => {
          setLoading(false);
          if (err !== 'Checkout closed') setError(err);
        }
      );
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Could not start checkout. Try again in a moment.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="checkout-desc">
        <DialogHeader>
          <DialogTitle>{product.name} Pro</DialogTitle>
          <p id="checkout-desc" className="text-[var(--color-muted)]">
            Pay in rupees through Razorpay. Your licence key shows on the next screen and is emailed to you.
          </p>
        </DialogHeader>

        {error && (
          <p className="mb-4 border border-[var(--color-danger)] px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-3 border-0 p-0">
            <legend className="sr-only">Contact</legend>
            <div>
              <Label htmlFor="checkout-email">Email for license delivery</Label>
              <Input
                id="checkout-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="checkout-name">Name (optional)</Label>
                <Input id="checkout-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="checkout-phone">Phone (optional)</Label>
                <Input id="checkout-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </fieldset>

          <div>
            <Label htmlFor="checkout-coupon">Coupon code</Label>
            <div className="flex gap-2">
              <Input id="checkout-coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
              <Button type="button" variant="secondary" onClick={handleApplyCoupon}>
                Apply
              </Button>
            </div>
            {appliedCoupon && (
              <p className="mt-1.5 text-sm text-[var(--color-success)]">Applied: {appliedCoupon.code}</p>
            )}
            {couponError && (
              <p className="mt-1.5 text-sm text-[var(--color-danger)]" role="alert">
                {couponError}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4" />
            <span>
              I accept the{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="underline">Terms</a> and{' '}
              <a href="/refunds" target="_blank" rel="noreferrer" className="underline">Refund policy</a>.
            </span>
          </label>

          <div className="flex items-baseline justify-between border-t-2 border-[var(--color-foreground)] pt-3">
            <span className="font-semibold">Total due</span>
            <span className="font-mono-price text-2xl font-semibold">{formatINR(finalPrice)}</span>
          </div>

          <TurnstileWidget siteKey={turnstileSiteKey} onToken={setTurnstileToken} />

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Opening Razorpay…
              </>
            ) : (
              `Continue to pay ${formatINR(finalPrice)}`
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
