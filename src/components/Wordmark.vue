<script setup>
// Brand wordmark. "Adrian's" reads as the editorial voice in Fraunces;
// "Cut" picks up the amber accent in italic — a quiet nod to the
// director's-cut notation that's the platform's identity.
defineProps({
  size: { type: String, default: 'md' } // sm | md | lg | xl | hero
});
</script>

<template>
  <span :class="['wordmark', `wordmark-${size}`]">
    <span class="wordmark-name">Adrian's</span>
    <span class="wordmark-cut">Cut</span>
  </span>
</template>

<style scoped>
.wordmark {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.015em;
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: 0.22em;
  line-height: 1;
  color: theme('colors.bone.50');
}
.wordmark-cut {
  font-style: italic;
  font-weight: 500;
  color: theme('colors.amber.accent');
  letter-spacing: 0;
  /* Subtle slash flourish — like a director's cut tally mark — drawn
     in CSS so no asset is required. Visible only on md+ sizes. */
  position: relative;
}
.wordmark-md .wordmark-cut::before,
.wordmark-lg .wordmark-cut::before,
.wordmark-xl .wordmark-cut::before,
.wordmark-hero .wordmark-cut::before {
  content: '';
  position: absolute;
  left: -0.18em;
  bottom: 0.12em;
  width: 1px;
  height: 0.8em;
  background: theme('colors.amber.accent' / 60%);
  transform: rotate(15deg);
}

.wordmark-sm   { font-size: 1rem; }       /* 16px */
.wordmark-md   { font-size: 1.5rem; }     /* 24px — header */
.wordmark-lg   { font-size: 1.875rem; }   /* 30px — login */
.wordmark-xl   { font-size: 2.5rem; }     /* 40px */
.wordmark-hero { font-size: 4rem; }       /* large landing-page treatment */
</style>
