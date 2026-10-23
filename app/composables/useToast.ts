interface Toast {
  id: number;
  text: string;
}

let nextId = 0;

export function useToast() {
  const toasts = useState<Toast[]>("toasts", () => []);

  function toast(text: string, ms = 3200) {
    const id = nextId++;
    toasts.value = [...toasts.value.slice(-2), { id, text }];
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, ms);
  }

  return { toasts, toast };
}
