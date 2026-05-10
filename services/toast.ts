// Tiny pub/sub for app-wide toasts. Any code can fire showToast(...) and the
// <Toast /> component mounted in _layout.tsx renders it. No props drilling needed.

export type ToastVariant = 'success' | 'error' | 'info';
export type ToastMessage = { text: string; variant: ToastVariant };
type Listener = (msg: ToastMessage) => void;

const listeners = new Set<Listener>();

export function showToast(text: string, variant: ToastVariant = 'success') {
  if (!text) return;
  for (const l of listeners) l({ text, variant });
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
