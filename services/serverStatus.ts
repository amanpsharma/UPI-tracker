// Tracks when API requests are taking long enough that the user should be told
// "the server is waking up" — common with Render free tier (~10s cold starts).
//
// Subscribers are notified whenever the slow-request flag changes. UI components
// can subscribe to render a banner.

type Listener = (isSlow: boolean) => void;

let isSlow = false;
let inFlightSlow = 0; // number of currently-running slow requests
const listeners = new Set<Listener>();

function emit() {
  const next = inFlightSlow > 0;
  if (next !== isSlow) {
    isSlow = next;
    listeners.forEach((l) => l(isSlow));
  }
}

export function subscribeServerStatus(listener: Listener): () => void {
  listeners.add(listener);
  // immediately deliver current state so the new subscriber is in sync
  listener(isSlow);
  return () => {
    listeners.delete(listener);
  };
}

export function getIsServerSlow() {
  return isSlow;
}

// Wrap a request promise: if it takes longer than `slowThresholdMs`, mark the
// server as "slow / waking up" until it resolves. Returns the original promise.
export function trackSlowRequest<T>(promise: Promise<T>, slowThresholdMs = 3000): Promise<T> {
  let markedSlow = false;
  const timer = setTimeout(() => {
    markedSlow = true;
    inFlightSlow++;
    emit();
  }, slowThresholdMs);

  return promise.finally(() => {
    clearTimeout(timer);
    if (markedSlow) {
      inFlightSlow = Math.max(0, inFlightSlow - 1);
      emit();
    }
  });
}
