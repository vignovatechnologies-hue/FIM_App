import { toast } from "sonner";

export const API_URL = "http://localhost:8000";
export const TOKEN_KEY = "fim.auth.token";

// ── Core fetch wrapper ────────────────────────────────────────────────────────
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("fim.auth.user");
      window.dispatchEvent(new Event("fim-auth-change"));
      window.location.href = `/auth?mode=signin&redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    let errorMsg = "Something went wrong";
    try {
      const data = await response.json();
      errorMsg = data.detail || data.message || errorMsg;
    } catch { /* not JSON */ }
    throw new Error(errorMsg);
  }

  const ct = response.headers.get("content-type");
  if (response.status === 204 || (ct && !ct.includes("application/json"))) return {} as T;

  return response.json();
}

// ── Dynamically load external script ─────────────────────────────────────────
function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Razorpay payment flow ─────────────────────────────────────────────────────
/**
 * Handles both LIVE (real Razorpay checkout) and MOCK (direct verify-signature)
 * payment flows depending on what the backend returns in create-order.
 *
 * @param amount       Total INR amount to charge
 * @param loanIds      Array of loan IDs to mark as paid after success
 * @param onSuccess    Callback invoked after successful verification
 */
export async function processRazorpayPayment(
  amount: number,
  loanIds: number[],
  onSuccess: () => void,
): Promise<void> {
  if (amount <= 0) {
    toast("All EMIs already paid for this cycle ✓");
    return;
  }

  // 1. Create order on backend
  const tid = toast.loading("Preparing payment…");
  let orderData: { order_id: string; key_id: string | null; amount: number; is_mock: boolean };
  try {
    orderData = await apiFetch("/api/payments/create-order", {
      method: "POST",
      // loan_ids go into Razorpay order notes so the webhook can auto-mark loans paid
      body: JSON.stringify({ amount, loan_ids: loanIds }),
    });
    toast.dismiss(tid);
  } catch (err) {
    toast.error(`Payment setup failed: ${(err as Error).message}`, { id: tid });
    return;
  }

  // 2a. MOCK MODE — skip Razorpay SDK, confirm directly ─────────────────────
  if (orderData.is_mock || !orderData.key_id) {
    const user = JSON.parse(localStorage.getItem("fim.auth.user") || "{}");
    const confirmTid = toast.loading(`Simulating payment of ₹${amount.toLocaleString("en-IN")}…`);
    try {
      const result = await apiFetch("/api/payments/verify-signature", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id:   orderData.order_id,
          razorpay_payment_id: `mock_pay_${Date.now()}`,
          razorpay_signature:  "mock_signature",
          loan_ids: loanIds,
          amount,
          is_mock: true,
        }),
      });
      toast.success(
        `Payment of ₹${amount.toLocaleString("en-IN")} successful! ✓`,
        { id: confirmTid, description: `${result.loans_paid?.length ?? loanIds.length} EMI(s) marked paid` },
      );
      onSuccess();
    } catch (err) {
      toast.error(`Payment failed: ${(err as Error).message}`, { id: confirmTid });
    }
    return;
  }

  // 2b. LIVE MODE — open real Razorpay checkout ─────────────────────────────
  const loaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!loaded) {
    toast.error("Razorpay SDK failed to load. Check your internet connection.");
    return;
  }

  const user = JSON.parse(localStorage.getItem("fim.auth.user") || "{}");
  const rzp = new (window as any).Razorpay({
    key:         orderData.key_id,
    amount:      Math.round(amount * 100),   // paise
    currency:    "INR",
    name:        "FIM Smart Pay",
    description: `Paying ${loanIds.length} EMI(s)`,
    order_id:    orderData.order_id,
    prefill: {
      name:    user.name    || "",
      email:   user.email   || "",
      contact: user.phone   || "",
    },
    theme: { color: "#0f4a3f" },

    // ── Success: payment completed in Razorpay modal ────────────────────────
    handler: async (response: any) => {
      const vtid = toast.loading("Verifying payment…");
      try {
        const result = await apiFetch("/api/payments/verify-signature", {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            loan_ids: loanIds,
            amount,
            is_mock: false,
          }),
        });
        toast.success(
          `₹${amount.toLocaleString("en-IN")} paid successfully! ✓`,
          { id: vtid, description: `${result.loans_paid?.length ?? loanIds.length} EMI(s) paid` },
        );
        onSuccess();
      } catch (err) {
        toast.error(`Verification failed: ${(err as Error).message}`, { id: vtid });
      }
    },

    // ── User closed the modal without paying ───────────────────────────────
    modal: {
      ondismiss: () => {
        toast("Payment cancelled", { description: "You closed the checkout window." });
      },
    },

    // ── Razorpay payment failed (wrong details / test mode issue) ──────────
    "payment.failed": (response: any) => {
      const reason = response?.error?.description || "Payment could not be processed";
      toast.error(`Payment failed: ${reason}`, {
        description:
          "💡 Test mode: Use card 4111 1111 1111 1111 · CVV: any 3 digits · Expiry: any future date · OTP: 1234",
        duration: 8000,
      });
    },
  });
  rzp.open();
}
