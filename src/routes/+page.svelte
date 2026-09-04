<script lang="ts">
  import { onMount } from 'svelte';
  import { themeConfig } from '$lib/stores/theme';
  import HeroHeadline from '$lib/components/HeroHeadline.svelte';

  interface Microfrontend {
    id: 'react' | 'vue' | 'solid' | 'qwik' | 'angular';
    name: string;
    description: string;
    color: string;
    devUrl: string;
    prodUrl: string;
  }

  interface CliCommand {
    prompt: string;
    input: string;
    output: string[];
    success: boolean;
  }

  interface TerminalState {
    history: CliCommand[];
    currentCommand: string;
  }

  let mfeReady: boolean = false;
  let selectedMfe: Microfrontend | null = null;
  let mfeContainer: HTMLDivElement;
  let terminalState: TerminalState = {
    history: [
      {
        prompt: '$',
        input: 'whoami',
        output: ['pwn4g3 — full-stack engineer'],
        success: true,
      },
      {
        prompt: '$',
        input: 'ls skills/',
        output: [
          'microfrontends/',
          'workers/',
          'pages/',
          'd1/',
          'r2/',
          'kv/',
          'github-actions/',
        ],
        success: true,
      },
      {
        prompt: '$',
        input: 'npm start',
        output: ['▶ loading frameworks...'],
        success: true,
      },
    ],
    currentCommand: '',
  };

  const MICROFRONTENDS: Microfrontend[] = [
    {
      id: 'react',
      name: '⚛️ React 19',
      description: 'Modern React with Server Components & Concurrent Rendering',
      color: '#61dafb',
      devUrl: 'http://localhost:5174/remoteEntry.js',
      prodUrl: 'https://pwnhaus-react.pages.dev/remoteEntry.js',
    },
    {
      id: 'vue',
      name: '🔶 Vue 3',
      description: 'Progressive framework with Composition API',
      color: '#42b983',
      devUrl: 'http://localhost:5175/remoteEntry.js',
      prodUrl: 'https://pwnhaus-vue.pages.dev/remoteEntry.js',
    },
    {
      id: 'solid',
      name: '⚡ SolidJS',
      description: 'Fine-grained reactivity with zero virtual DOM',
      color: '#4f46e5',
      devUrl: 'http://localhost:5176/remoteEntry.js',
      prodUrl: 'https://pwnhaus-solid.pages.dev/remoteEntry.js',
    },
    {
      id: 'qwik',
      name: '⚡ Qwik',
      description: 'Resumability for instant-on web applications',
      color: '#18b6f6',
      devUrl: 'http://localhost:5177/remoteEntry.js',
      prodUrl: 'https://pwnhaus-qwik.pages.dev/remoteEntry.js',
    },
    {
      id: 'angular',
      name: '🅰️ Angular 18',
      description: 'TypeScript-first framework with RxJS & DI',
      color: '#dd0031',
      devUrl: 'http://localhost:5178/remoteEntry.js',
      prodUrl: 'https://pwnhaus-angular.pages.dev/remoteEntry.js',
    },
  ];

  async function loadMicrofrontend(mfe: Microfrontend): Promise<void> {
    selectedMfe = mfe;
    mfeReady = false;

    try {
      const isDev = import.meta.env.DEV;
      const remoteUrl = isDev ? mfe.devUrl : mfe.prodUrl;

      // Load remote entry
      const script = document.createElement('script');
      script.src = remoteUrl;
      script.type = 'text/javascript';
      script.async = true;
      document.body.appendChild(script);

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${mfe.name} MFE`));
      });

      mfeReady = true;
    } catch (error) {
      console.error(`Failed to load ${mfe.name} microfrontend:`, error);
      selectedMfe = null;
    }
  }

  function closeMfe(): void {
    selectedMfe = null;
    mfeReady = false;
    if (mfeContainer) {
      mfeContainer.innerHTML = '';
    }
  }

  function handleTerminalCommand(command: string): void {
    if (!command.trim()) return;

    const newCommand: CliCommand = {
      prompt: '$',
      input: command,
      output: [],
      success: true,
    };

    switch (command.toLowerCase()) {
      case 'help':
        newCommand.output = ['Available commands:', 'whoami - Show identity', 'skills - List technical skills', 'projects - View portfolio', 'contact - Get in touch'];
        break;
      case 'whoami':
        newCommand.output = ['Jake Viefhaus (pwn4g3)', 'Full-stack Engineer', 'Security Researcher', 'Bug Bounty Hunter'];
        break;
      case 'skills':
        newCommand.output = [
          'Frontend: React, Vue, Svelte, SolidJS, Qwik, Angular',
          'Backend: Node.js, Go, Rust, Ruby',
          'Cloud: Cloudflare Workers, Pages, D1, R2, KV',
          'DevOps: GitHub Actions, Docker, CI/CD',
        ];
        break;
      case 'projects':
        newCommand.output = ['Scroll down to see projects →'];
        break;
      case 'contact':
        newCommand.output = [
          'Email: geekhaus314@proton.me',
          'GitHub: https://github.com/geekhaus314',
          'Ready to discuss opportunities',
        ];
        break;
      default:
        newCommand.output = [`Command not found: ${command}`, 'Type "help" for available commands'];
        newCommand.success = false;
    }

    terminalState.history = [...terminalState.history, newCommand];
    terminalState.currentCommand = '';
  }

  onMount(() => {
    // Initialize Module Federation shared scope
    if (!window.__webpack_share_scopes__) {
      window.__webpack_share_scopes__ = {};
    }
  });
</script>

<svelte:head>
  <title>{$themeConfig.name} — pwn4g3 Microfrontends Showcase</title>
</svelte:head>

<div id="top" class="hero section">
  <div class="hero-copy">
    <HeroHeadline />
  </div>
  <div class="hero-visual">
    <div class="terminal">
      <div class="terminal-bar">
        <span></span>
        <span></span>
        <span></span>
        <b>portfolio.sh</b>
      </div>
      <div class="cli-terminal">
        <div class="cli-history">
          {#each terminalState.history as command}
            <div class="cli-line-prompt">
              <span class="prompt">{command.prompt}</span>
              <span class="input">{command.input}</span>
            </div>
            {#each command.output as line}
              <div class="cli-line-output" class:success={command.success}>
                {line}
              </div>
            {/each}
          {/each}
        </div>
        <form
          class="cli-prompt"
          on:submit={(e) => {
            e.preventDefault();
            handleTerminalCommand(terminalState.currentCommand);
          }}
        >
          <span>$</span>
          <input
            type="text"
            placeholder="Type 'help' for commands"
            bind:value={terminalState.currentCommand}
            autocomplete="off"
          />
          <span class="cursor">_</span>
        </form>
      </div>
    </div>
  </div>
</div>

<section id="portfolio" class="section">
  <div class="section-heading">
    <div>
      <div class="eyebrow">
        <i></i>
        MICROFRONTEND SHOWCASE
      </div>
      <h2>Multi-Framework Excellence</h2>
      <p>
        Each framework deployed independently via Module Federation, showcasing production-ready architectural
        patterns.
      </p>
    </div>
  </div>

  <div class="mfe-grid">
    {#each MICROFRONTENDS as mfe (mfe.id)}
      <div
        class="mfe-card"
        style="--accent-color: {mfe.color}"
        on:click={() => loadMicrofrontend(mfe)}
        on:keydown={(e) => e.key === 'Enter' && loadMicrofrontend(mfe)}
        role="button"
        tabindex="0"
      >
        <div class="mfe-header">
          <h3>{mfe.name}</h3>
          <span class="mfe-status">Ready</span>
        </div>
        <p>{mfe.description}</p>
        <div class="mfe-footer">
          <span class="mfe-action">Explore →</span>
        </div>
      </div>
    {/each}
  </div>
</section>

{#if selectedMfe && mfeReady}
  <div class="mfe-modal-overlay" on:click={closeMfe}>
    <div class="mfe-modal" on:click={(e) => e.stopPropagation()}>
      <button class="mfe-modal-close" on:click={closeMfe}>✕</button>
      <div class="mfe-modal-content" bind:this={mfeContainer}>
        <!-- Microfrontend will be mounted here -->
        <div class="mfe-loading">
          <p>Loading {selectedMfe.name}...</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<section class="section">
  <div class="section-heading">
    <div>
      <h2>Architecture Highlights</h2>
      <p>Production-grade infrastructure demonstrating enterprise-scale patterns.</p>
    </div>
  </div>

  <div class="architecture-grid">
    <div>
      <span class="section-kicker">🔧 Module Federation</span>
      <strong>Dynamic Loading</strong>
      <p>
        Independent deployment of React, Vue, Solid, Qwik, and Angular microfrontends with shared dependencies.
      </p>
    </div>
    <div>
      <span class="section-kicker">⚡ Cloudflare Workers</span>
      <strong>Edge API Gateway</strong>
      <p>CORS-enabled API with rate limiting, D1 analytics, R2 asset proxying, and Solidity auditing.</p>
    </div>
    <div>
      <span class="section-kicker">📦 Cloudflare Pages</span>
      <strong>Global CDN</strong>
      <p>Multi-project deployment: main shell, React, Vue, Solid, Qwik, Angular all served from edge.</p>
    </div>
    <div>
      <span class="section-kicker">💾 Cloudflare D1</span>
      <strong>Edge Database</strong>
      <p>Analytics tracking, project metadata, booking submissions, and Solidity audit cache.</p>
    </div>
    <div>
      <span class="section-kicker">🗂️ Cloudflare R2</span>
      <strong>Asset Storage</strong>
      <p>Portfolio images, project assets, and resumes served via Worker proxy with cache headers.</p>
    </div>
    <div>
      <span class="section-kicker">🔐 Cloudflare KV</span>
      <strong>Rate Limiting</strong>
      <p>Distributed cache for API rate limiting, session data, and ephemeral state management.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="section-heading">
    <div>
      <h2>Tech Stack</h2>
      <p>Everything built, deployed, and scaled for production.</p>
    </div>
  </div>

  <div class="stack-cloud">
    <span>SvelteKit</span>
    <span>React 19</span>
    <span>Vue 3</span>
    <span>SolidJS</span>
    <span>Qwik</span>
    <span>Angular 18</span>
    <span>TypeScript</span>
    <span>Vite</span>
    <span>Module Federation</span>
    <span>Cloudflare Workers</span>
    <span>Cloudflare Pages</span>
    <span>Cloudflare D1</span>
    <span>Cloudflare R2</span>
    <span>Cloudflare KV</span>
    <span>GitHub Actions</span>
    <span>CSS-in-JS</span>
  </div>
</section>

<style>
  .hero-copy,
  .hero-visual {
    position: relative;
    z-index: 1;
  }

  .cli-history {
    min-height: 176px;
    margin-bottom: 1rem;
    overflow-wrap: break-word;
    font-size: 0.7rem;
    line-height: 1.6;
  }

  .cli-line-prompt {
    display: flex;
    gap: 0.5rem;
    color: var(--accent-bright);
  }

  .cli-line-prompt .prompt {
    color: var(--accent);
    font-weight: bold;
  }

  .cli-line-prompt .input {
    color: var(--ink);
  }

  .cli-line-output {
    color: var(--muted);
    margin-left: 0.5rem;
  }

  .cli-line-output.success {
    color: #c3e88d;
  }

  .mfe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .mfe-card {
    padding: 1.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.3s;
    border-left: 3px solid var(--accent-color, var(--accent));
    border-radius: 8px;
  }

  .mfe-card:hover {
    border-color: var(--accent-color, var(--accent));
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  }

  .mfe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .mfe-header h3 {
    margin: 0;
    font-size: 1.3rem;
  }

  .mfe-status {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: rgba(39, 174, 96, 0.2);
    color: #27ae60;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  .mfe-card p {
    margin: 0 0 1.5rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .mfe-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mfe-action {
    color: var(--accent-color, var(--accent));
    font-weight: 600;
    font-size: 0.85rem;
  }

  .mfe-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    backdrop-filter: blur(8px);
  }

  .mfe-modal {
    width: min(90vw, 1200px);
    height: min(90vh, 800px);
    background: var(--page);
    border: 1px solid var(--border);
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .mfe-modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: 1px solid var(--border);
    width: 40px;
    height: 40px;
    cursor: pointer;
    border-radius: 6px;
    font-size: 1.2rem;
    z-index: 1000;
    transition: all 0.2s;
    color: var(--text);
  }

  .mfe-modal-close:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .mfe-modal-content {
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: 3rem 2rem 2rem;
  }

  .mfe-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.2rem;
    color: var(--text-muted);
  }

  .architecture-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .architecture-grid > div {
    min-height: 220px;
    padding: 1.5rem;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .architecture-grid > div:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  .architecture-grid strong {
    display: block;
    margin: 0.8rem 0 0.5rem;
    font-size: 1.2rem;
    color: var(--text);
  }

  .architecture-grid p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }
</style>
