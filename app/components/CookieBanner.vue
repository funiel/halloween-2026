<script setup lang="ts">
const emit = defineEmits<{ accept: [] }>();
const { toast } = useToast();

const dodges = ref(0);
const offset = ref({ x: 0, y: 0, r: 0 });
const gaveUp = computed(() => dodges.value >= 4);

/** The Reject button runs away. On touch it moves on pointerdown, so the tap never lands. */
function dodge(e: PointerEvent) {
  if (gaveUp.value) return;
  // Touch fires pointerenter right before pointerdown; count that tap once.
  if (e.type === "pointerenter" && e.pointerType !== "mouse") return;
  e.preventDefault();
  dodges.value++;
  offset.value = {
    x: (Math.random() - 0.5) * 220,
    y: -(20 + Math.random() * 120),
    r: (Math.random() - 0.5) * 40,
  };
}

function reject() {
  if (!gaveUp.value) return;
  toast("Rejection isn't available in your region. Accepted all instead. 🍪");
  emit("accept");
}

function acceptAll(loud: boolean) {
  if (loud) toast("Wow, thanks! Enthusiasm noted in your profile.");
  emit("accept");
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end bg-black/40 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:items-center sm:justify-center">
    <div class="animate-send-up w-full max-w-md rounded-3xl bg-ink-800 p-5 shadow-2xl ring-1 ring-white/5">
      <div class="mb-1 text-lg font-semibold">🍪 We value your privacy</div>
      <p class="mb-4 text-sm leading-6 text-ink-300">
        Not as much as your data, but we do value it. We use cookies, tracking pixels, vibes, and the
        person standing behind you to improve your experience and our model.
      </p>
      <div class="flex flex-col gap-2">
        <button type="button" class="rounded-full bg-ink-100 py-3 font-semibold text-ink-900" @click="acceptAll(false)">
          Accept all
        </button>
        <button type="button" class="rounded-full bg-ink-700 py-3 font-semibold" @click="acceptAll(true)">
          Accept all, but enthusiastically
        </button>
        <div class="relative h-9">
          <button
            type="button"
            class="absolute left-1/2 top-1 px-3 py-1 text-xs whitespace-nowrap text-ink-500 transition-transform duration-500 ease-spring"
            :style="{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px) rotate(${offset.r}deg)` }"
            @pointerenter="dodge"
            @pointerdown="dodge"
            @click="reject"
          >
            {{ gaveUp ? "Reject (not available in your region)" : "Reject" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
