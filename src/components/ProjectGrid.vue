<template>
  <div class="grid-container">
    <!-- Category Filter Controls -->
    <div class="filter-bar">
      <button 
        v-for="cat in categories" 
        :key="cat"
        :class="{ active: activeCategory === cat }"
        @click="activeCategory = cat"
      >
        \{{ cat.toUpperCase() }}
      </button>
    </div>

    <!-- Responsive Bento Layout Grid -->
    <div class="bento-grid">
      <div 
        v-for="project in filteredProjects" 
        :key="project.id" 
        class="bento-card"
        :class="project.size"
      >
        <div class="card-header">
          <span class="tag">\{{ project.category }}</span>
          <span class="status">\{{ project.status }}</span>
        </div>
        <h3>\{{ project.title }}</h3>
        <p>\{{ project.description }}</p>
        <div class="card-footer">
          <code>\{{ project.tech }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const categories = ['all', 'security', 'systems', 'automation'];
const activeCategory = ref('all');

// Mock data tracking your core technical focus projects
const projects = ref([
  {
    id: 1,
    title: 'RepoSentinel Engine',
    description: 'AI-driven monitoring tool built to automate repository anomaly and issue tracking in real time.',
    category: 'automation',
    status: 'stable',
    tech: 'Go / GitHub API',
    size: 'wide'
  },
  {
    id: 2,
    title: 'KananOS Infrastructure',
    description: 'Custom optimized system architecture layer deployed cleanly via automated Railway pipelines.',
    category: 'systems',
    status: 'active',
    tech: 'Linux / Docker',
    size: 'tall'
  },
  {
    id: 3,
    title: 'Vulnerability Analysis Lab',
    description: 'Automated threat modeling and defensive posture validations against active network targets.',
    category: 'security',
    status: 'continuous',
    tech: 'DevSecOps / CI',
    size: 'standard'
  },
  {
    id: 4,
    title: 'Mindra Engineering Agent Node',
    description: 'Delegated task automation matrix managing asynchronous multi-agent programming workflows.',
    category: 'automation',
    status: 'prototype',
    tech: 'Node.js / TS',
    size: 'standard'
  }
]);

// Computed state slice filtering raw array configurations dynamically
const filteredProjects = computed(() => {
  if (activeCategory.value === 'all') return projects.value;
  return projects.value.filter(p => p.category === activeCategory.value);
});
</script>

<style scoped>
.grid-container {
  font-family: 'Courier New', Courier, monospace;
  margin-top: 3rem;
}
.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}
button {
  background: #141724;
  border: 1px solid #1f2438;
  color: #a6accd;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 4px;
  font-family: inherit;
  transition: all 0.2s ease;
}
button:hover, button.active {
  border-color: #4ee082;
  color: #4ee082;
  background: rgba(78, 224, 130, 0.05);
}
.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  grid-auto-rows: minmax(180px, auto);
}
.bento-card {
  background: #0a0b10;
  border: 1px solid #1f2438;
  border-radius: 6px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.bento-card.wide {
  grid-column: span 2;
}
@media (max-width: 768px) {
  .bento-card.wide { grid-column: span 1; }
}
.card-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}
.tag { color: #4ee082; }
.status { color: #f07178; }
h3 {
  color: #e2e8f0;
  margin: 1rem 0 0.5rem 0;
  font-size: 1.2rem;
}
p {
  color: #a6accd;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0 0 1rem 0;
}
code {
  color: #c3e88d;
  font-size: 0.85rem;
}
</style>
