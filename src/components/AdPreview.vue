<script setup>
import { computed } from 'vue';

// Inert renderer that shows what an ad will look like in production.
// Mirrors AdSlot.vue's per-format markup but without anchors, click
// tracking, or impression telemetry. Sizes itself to fit the parent's
// constraints by scaling the native dimensions.

const props = defineProps({
  ad: { type: Object, required: true }, // { advertiser, headline, body, imageUrl, format }
  // The render scales to fit BOTH constraints (whichever is tighter).
  // Native size never up-scales beyond 1.0 — small formats stay legible.
  maxWidth:  { type: Number, default: 800 },
  maxHeight: { type: Number, default: 600 }
});

const NATIVE = {
  leaderboard:    { w: 728, h: 90 },
  billboard:      { w: 970, h: 250 },
  mpu:            { w: 300, h: 250 },
  half_page:      { w: 300, h: 600 },
  mobile_banner:  { w: 320, h: 50 },
  native_card:    { w: 200, h: 300 },
  sponsored_post: { w: 820, h: 180 },
  text_link:      { w: 480, h: 40 }
};

const monogram = computed(() => {
  const name = props.ad?.advertiser || '';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';
});

const dims = computed(() => {
  const native = NATIVE[props.ad?.format] || { w: 300, h: 200 };
  const scale = Math.min(props.maxWidth / native.w, props.maxHeight / native.h, 1);
  return {
    nativeW: native.w,
    nativeH: native.h,
    scale,
    boxW: Math.round(native.w * scale),
    boxH: Math.round(native.h * scale)
  };
});

const containerStyle = computed(() => ({
  width: `${dims.value.boxW}px`,
  height: `${dims.value.boxH}px`
}));
const innerStyle = computed(() => ({
  width: `${dims.value.nativeW}px`,
  height: `${dims.value.nativeH}px`,
  transform: `scale(${dims.value.scale})`,
  transformOrigin: 'top left'
}));

const a = computed(() => ({
  advertiser: props.ad?.advertiser || 'Your brand',
  headline:   props.ad?.headline   || 'Your headline appears here',
  body:       props.ad?.body       || '',
  imageUrl:   props.ad?.imageUrl   || ''
}));
</script>

<template>
  <div class="ad-preview" :style="containerStyle">
    <div class="ad-preview-inner" :style="innerStyle">
      <!-- Leaderboard 728×90 -->
      <div
        v-if="ad.format === 'leaderboard'"
        class="relative w-full h-full rounded-md overflow-hidden border border-ink-700/80 bg-ink-900 flex items-center"
      >
        <img v-if="a.imageUrl" :src="a.imageUrl" :alt="a.headline" class="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/60 to-transparent"></div>
        <div class="relative z-10 px-5">
          <div class="text-[9px] uppercase tracking-eyebrow text-amber-accent">Sponsored · {{ a.advertiser }}</div>
          <div class="display text-lg font-medium mt-0.5 leading-tight text-bone-50 line-clamp-1">{{ a.headline }}</div>
        </div>
      </div>

      <!-- Billboard 970×250 -->
      <div
        v-else-if="ad.format === 'billboard'"
        class="relative w-full h-full rounded-xl overflow-hidden border border-ink-700/80 bg-ink-900"
      >
        <img v-if="a.imageUrl" :src="a.imageUrl" :alt="a.headline" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/10"></div>
        <div class="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 max-w-[60%]">
          <div>
            <div class="eyebrow text-amber-accent">— Sponsored · {{ a.advertiser }}</div>
            <h3 class="display text-2xl sm:text-3xl font-semibold leading-tight mt-2 text-bone-50">{{ a.headline }}</h3>
            <p v-if="a.body" class="text-sm text-bone-200 mt-2 leading-relaxed line-clamp-2">{{ a.body }}</p>
          </div>
          <div class="text-xs text-amber-accent inline-flex items-center gap-1.5 self-start">
            Learn more
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>
      </div>

      <!-- MPU 300×250 -->
      <div
        v-else-if="ad.format === 'mpu'"
        class="relative w-full h-full rounded-lg overflow-hidden border border-ink-700/80 bg-ink-900"
      >
        <img v-if="a.imageUrl" :src="a.imageUrl" :alt="a.headline" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent"></div>
        <div class="absolute top-2 left-2 right-2 flex items-center justify-between">
          <span class="text-[9px] uppercase tracking-eyebrow text-bone-300 bg-ink-950/70 px-1.5 py-0.5 rounded">Ad · {{ a.advertiser }}</span>
        </div>
        <div class="absolute bottom-3 left-3 right-3">
          <h4 class="display text-base font-medium leading-tight text-bone-50 line-clamp-2">{{ a.headline }}</h4>
        </div>
      </div>

      <!-- Half-page 300×600 -->
      <div
        v-else-if="ad.format === 'half_page'"
        class="relative w-full h-full rounded-lg overflow-hidden border border-ink-700/80 bg-ink-900"
      >
        <img v-if="a.imageUrl" :src="a.imageUrl" :alt="a.headline" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent"></div>
        <div class="absolute top-3 left-3"><span class="text-[9px] uppercase tracking-eyebrow text-bone-300 bg-ink-950/70 px-1.5 py-0.5 rounded">Ad · {{ a.advertiser }}</span></div>
        <div class="absolute bottom-4 left-4 right-4">
          <h4 class="display text-xl font-medium leading-tight text-bone-50">{{ a.headline }}</h4>
          <p v-if="a.body" class="text-xs text-bone-200/90 mt-2 line-clamp-3">{{ a.body }}</p>
          <div class="text-[11px] text-amber-accent mt-3 inline-flex items-center gap-1">Open <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg></div>
        </div>
      </div>

      <!-- Mobile banner 320×50 -->
      <div
        v-else-if="ad.format === 'mobile_banner'"
        class="relative w-full h-full rounded-md overflow-hidden border border-ink-700/80 bg-ink-900 flex items-center px-3 gap-3"
      >
        <img v-if="a.imageUrl" :src="a.imageUrl" :alt="a.advertiser" class="w-9 h-9 rounded object-cover shrink-0" />
        <div v-else class="w-9 h-9 rounded bg-ink-800 flex items-center justify-center shrink-0">
          <span class="display text-xs text-amber-accent font-semibold">{{ monogram }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[9px] uppercase tracking-eyebrow text-amber-accent">Ad · {{ a.advertiser }}</div>
          <div class="text-[12px] text-bone-50 line-clamp-1 leading-tight">{{ a.headline }}</div>
        </div>
      </div>

      <!-- Native card 2:3 -->
      <div
        v-else-if="ad.format === 'native_card'"
        class="relative w-full h-full overflow-hidden rounded-xl bg-ink-800 shadow-poster ring-1 ring-amber-accent/15"
      >
        <img v-if="a.imageUrl" :src="a.imageUrl" :alt="a.headline" class="w-full h-full object-cover" />
        <div v-else class="absolute inset-0 bg-gradient-to-br from-ink-800 to-ink-900 flex items-center justify-center">
          <span class="display text-4xl text-amber-accent font-semibold">{{ monogram }}</span>
        </div>
        <div class="absolute top-2 left-2 right-2 flex items-center justify-between">
          <span class="text-[9px] uppercase tracking-eyebrow text-amber-accent bg-ink-950/80 px-1.5 py-0.5 rounded">Ad</span>
          <span class="text-[10px] mono text-bone-300/90 truncate max-w-[60%] text-right">{{ a.advertiser }}</span>
        </div>
        <div class="absolute inset-x-3 bottom-3 z-10">
          <div class="display text-sm font-medium text-bone-50 leading-tight line-clamp-2">{{ a.headline }}</div>
        </div>
      </div>

      <!-- Sponsored post (fluid horizontal card) -->
      <div
        v-else-if="ad.format === 'sponsored_post'"
        class="card flex flex-row items-stretch overflow-hidden w-full h-full"
      >
        <div v-if="a.imageUrl" class="w-56 shrink-0 bg-ink-800">
          <img :src="a.imageUrl" :alt="a.headline" class="w-full h-full object-cover" />
        </div>
        <div
          v-else
          aria-hidden="true"
          class="w-56 shrink-0 relative bg-ink-800 overflow-hidden flex items-center justify-center"
        >
          <div class="absolute inset-0 opacity-50" style="background-image: repeating-linear-gradient(90deg, rgba(232,176,74,0.08) 0 2px, transparent 2px 14px), repeating-linear-gradient(90deg, transparent 0 4px, rgba(8,7,10,0.55) 4px 14px);"></div>
          <div class="relative text-center px-4">
            <div class="display text-4xl font-semibold tracking-tight text-amber-accent leading-none">{{ monogram }}</div>
            <div class="eyebrow text-bone-300/80 mt-3">— Sponsored</div>
          </div>
        </div>
        <div class="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-3">
          <div>
            <div class="eyebrow text-bone-300 mb-1.5">— Sponsored · {{ a.advertiser }}</div>
            <h3 class="display text-xl font-medium leading-tight">{{ a.headline }}</h3>
            <p v-if="a.body" class="text-sm text-bone-300 mt-2 leading-relaxed">{{ a.body }}</p>
          </div>
          <div class="text-xs text-amber-accent inline-flex items-center gap-1.5">
            Learn more
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </div>
      </div>

      <!-- Text link (single line) -->
      <div
        v-else-if="ad.format === 'text_link'"
        class="w-full h-full text-center text-xs text-bone-300 py-3 flex items-center justify-center gap-1.5"
      >
        <span class="text-amber-accent">★</span>
        <span>{{ a.headline }}</span>
        <span class="text-ink-500">— Sponsored by {{ a.advertiser }}</span>
      </div>

      <!-- Unknown format fallback -->
      <div v-else class="w-full h-full flex items-center justify-center text-xs text-bone-400 italic">
        Preview for "{{ ad.format }}" not available
      </div>
    </div>
  </div>
</template>

<style scoped>
.ad-preview {
  position: relative;
  overflow: hidden;
  /* Centered when smaller than its column */
  flex: 0 0 auto;
}
.ad-preview-inner {
  position: relative;
}
</style>
