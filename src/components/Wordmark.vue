<script setup>
// Brand wordmark. The logo art lives in /public — gold cursive "Adrian's"
// over the cream "CUT" caps with the swoosh-star flourish. Two PNGs:
// `logo.png` is the wordmark-only mark with a transparent background,
// used at sm/md/lg/xl. `logo-hero.png` is the full lockup with the
// "DIRECTOR'S CUT" tagline, also transparent, used for the admin login
// hero treatment.

defineProps({
  size: { type: String, default: 'md' } // sm | md | lg | xl | hero
});
</script>

<template>
  <img
    v-if="size === 'hero'"
    src="/logo-hero.png"
    alt="Adrian's Cut"
    :class="['wordmark', `wordmark-${size}`]"
    draggable="false"
  />
  <img
    v-else
    src="/logo.png"
    alt="Adrian's Cut"
    :class="['wordmark', `wordmark-${size}`]"
    draggable="false"
  />
</template>

<style scoped>
.wordmark {
  display: inline-block;
  width: auto;
  user-select: none;
}

.wordmark-sm   { height: 22px; }
.wordmark-md   { height: 40px; }
.wordmark-lg   { height: 56px; }
.wordmark-xl   { height: 76px; }
.wordmark-hero { height: 140px; }
</style>
