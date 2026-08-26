<template>
  <div class="architecture-matrix">
    <div class="architecture-tabs" role="tablist" aria-label="Deployment boundaries">
      <button v-for="layer in layers" :key="layer.name" type="button" role="tab" :aria-selected="active === layer.name" :class="{ active: active === layer.name }" @click="active = layer.name">{{ layer.name }}</button>
    </div>
    <div class="architecture-detail"><span>{{ selected.name }}</span><strong>{{ selected.role }}</strong><p>{{ selected.focus }}</p></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const layers = [
  { name: 'Node.js', role: 'Service runtime', focus: 'APIs, workers, and integration boundaries' },
  { name: 'Vite', role: 'Build system', focus: 'Fast feedback and optimized asset delivery' },
  { name: 'Cloudflare', role: 'Edge platform', focus: 'Secure delivery, DNS, and globally distributed runtime' },
  { name: 'Rust', role: 'Systems service', focus: 'Explicit memory safety and predictable performance' },
  { name: 'Go', role: 'Network service', focus: 'Concurrent APIs with a small operational footprint' },
  { name: 'Ruby', role: 'Product service', focus: 'Fast iteration for business workflows and APIs' }
];
const active = ref(layers[0].name);
const selected = computed(() => layers.find((layer) => layer.name === active.value) ?? layers[0]);
</script>
