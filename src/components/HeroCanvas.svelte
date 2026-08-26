<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let canvasRef: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationFrameId: number;

  let mouse = { x: 0, y: 0, active: false };
  let particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number }> = [];

  let themeColor = 'rgba(78, 224, 130, 0.25)';
  let particleColor = 'rgba(78, 224, 130, ';

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvasRef.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;

    if (particles.length < 60 && Math.random() > 0.4) {
      particles = [...particles, {
        x: mouse.x,
        y: mouse.y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        alpha: 1.0
      }];
    }
  };

  const handleMouseLeave = () => {
    mouse.active = false;
  };

  const handleThemeChange = (e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const hexColor = customEvent.detail;
    
    themeColor = hexColor === '#e2e8f0' ? 'rgba(78, 224, 130, 0.25)' : `${hexColor}40`;
    particleColor = hexColor === '#e2e8f0' ? 'rgba(78, 224, 130, ' : `${hexColor}`;
    
    const subtitle = document.querySelector('.banner-overlay p') as HTMLElement;
    if (subtitle) subtitle.style.color = hexColor === '#e2e8f0' ? '#4ee082' : hexColor;
  };

  const drawLoop = () => {
    if (!canvasRef || !ctx) return;

    ctx.fillStyle = 'rgba(13, 14, 21, 0.15)';
    ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

    if (mouse.active) {
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(0, mouse.y);
      ctx.lineTo(canvasRef.width, mouse.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mouse.x, 0);
      ctx.lineTo(mouse.x, canvasRef.height);
      ctx.stroke();
    }

    particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.015;

      if (p.alpha <= 0) {
        particles.splice(idx, 1);
        return;
      }

      if (particleColor.startsWith('rgba')) {
        ctx.fillStyle = `${particleColor}${p.alpha})`;
      } else {
        ctx.fillStyle = particleColor;
        ctx.globalAlpha = p.alpha;
      }
      
      ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
      ctx.globalAlpha = 1.0;
    });

    animationFrameId = requestAnimationFrame(drawLoop);
  };

  const handleResize = () => {
    if (!canvasRef) return;
    canvasRef.width = window.innerWidth;
    canvasRef.height = 260;
  };

  onMount(() => {
    ctx = canvasRef.getContext('2d')!;
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('portfolio-theme', handleThemeChange);
    drawLoop();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('portfolio-theme', handleThemeChange);
      // Safely cancel the animation frame loop only if window scope is active
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }
  });
</script>

<div class="canvas-wrapper">
  <canvas
    bind:this={canvasRef}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
  ></canvas>
  <div class="banner-overlay">
    <h1>PWN4G3 // PORTFOLIO</h1>
    <p>SECURE APPLICATION RUNTIME LABS</p>
  </div>
</div>

<style>
  .canvas-wrapper {
    position: relative;
    width: 100%;
    background-color: #0d0e15;
    border-bottom: 1px solid #1f2438;
    overflow: hidden;
  }
  canvas {
    display: block;
    cursor: crosshair;
  }
  .banner-overlay {
    position: absolute;
    top: 50%;
    left: 5%;
    transform: translateY(-50%);
    pointer-events: none;
    font-family: 'Courier New', Courier, monospace;
  }
  h1 {
    margin: 0;
    font-size: 2.2rem;
    color: #e2e8f0;
    letter-spacing: 4px;
  }
  p {
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
    color: #4ee082;
    letter-spacing: 2px;
  }
</style>
