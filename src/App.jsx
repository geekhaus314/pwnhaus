import { useState, useEffect } from 'react'

const heroPhoto = '/geekhaus-self-1.jpg'

const projects = [
  {
    id: 'kananos',
    name: 'KananOS / United Distribution',
    tagline: 'Multi-tenant B2B e-commerce wholesale platform',
    stack: ['Next.js', 'TypeScript', 'Vercel'],
    url: 'https://united-distro.vercel.app/united',
    repo: 'https://github.com/geekhaus314/kanan-e',
    images: ['/shots/united-distro.png', '/shots/kananos-home.png', '/shots/kanan-e-checkout.png'],
    detail: [
      'E-commerce infrastructure built for Kanan Enterprises LLC, DBA United Distribution, a wholesale smoke shop distributor in Florissant, MO.',
      'Multi-tenant Next.js architecture supporting branded storefronts (united-distro and kanan-e) with product catalogs, brands, and browse routes.',
      'Production deployment on Vercel with checkout flow, product imagery pipelines, and catalog management.',
    ],
  },
  {
    id: 'myhairloss',
    name: 'Brian Ivie Hair — myhairloss.com',
    tagline: 'Client site for a hair loss clinic, live with custom domain',
    stack: ['Next.js', 'MDX', 'Cloudflare Pages'],
    url: 'https://www.myhairloss.com',
    repo: 'https://github.com/geekhaus314/myhairloss-stl',
    images: ['/shots/myhairloss.png', '/shots/brian-home.png', '/shots/brian-services.png', '/shots/brian-shop.png'],
    detail: [
      'Production Next.js site for Brian Ivie Hair, deployed to Cloudflare Pages with custom domains (myhairloss.com, www, admin subdomain).',
      'Service pages, shop section, and admin tooling — maintained and updated continuously.',
      'GitHub-connected auto-deploy pipeline with the Cloudflare Pages integration.',
    ],
  },
  {
    id: 'compass',
    name: 'Compass — Psychedelic Trip Journal',
    tagline: 'Private journaling companion for psychedelic experiences',
    stack: ['React', 'Vite', 'JavaScript'],
    url: '',
    repo: 'https://github.com/geekhaus314/Compass-Psychadelic-Trip-Journal',
    images: ['/shots/compass.png'],
    detail: [
      'Vite + React journaling app for documenting psychedelic experiences in a calm, private space.',
      'Clean single-page interface with session entries and reflection-oriented UI.',
      'In active development — interface and deployment in progress.',
    ],
  },
  {
    id: 'angie',
    name: 'Angie Viefhaus — Wildlife Photography',
    tagline: 'Photography portfolio for a wildlife photographer',
    stack: ['React', 'TypeScript', 'Tailwind', 'Cloudflare Pages'],
    url: 'https://angie-viefhaus.pages.dev',
    repo: 'https://github.com/geekhaus314/angie-viefhaus',
    images: ['/shots/angie-pages.png'],
    detail: [
      'Full photography portfolio — hero, manifesto, gallery, and lightbox — for a wildlife photographer.',
      'Serif-forward editorial design (Cormorant Garamond) with a dark, gallery-grade presentation.',
      'Deployed to Cloudflare Pages; the same design language powers this portfolio.',
    ],
  },
  {
    id: 'agentos',
    name: 'AgentOS — Vertical AI Revenue Infrastructure',
    tagline: 'Multi-tenant AI revenue workflow platform',
    stack: ['Java', 'Gradle', 'AI Agents'],
    url: 'https://github.com/geekhaus314/agentos',
    repo: 'https://github.com/geekhaus314/agentos',
    images: [],
    detail: [
      'Multi-tenant, vertical AI revenue workflow platform with reusable core infrastructure.',
      'Industry vertical modules (commercial roofing, HVAC, insurance), white-label reseller deployment, configurable workflow engine.',
      'AI agent orchestration with explicit tool authorization and full audit logging for compliance.',
    ],
  },
  {
    id: 'proofshelf',
    name: 'ProofShelf — Full-Stack SaaS',
    tagline: 'Next.js + Postgres/pgvector + Redis + Clerk',
    stack: ['Next.js', 'PostgreSQL', 'pgvector', 'Redis', 'Clerk'],
    url: 'https://github.com/geekhaus314',
    repo: 'https://github.com/geekhaus314',
    images: [],
    detail: [
      'Full-stack SaaS with PostgreSQL + pgvector for semantic search, Redis for caching, Clerk for authentication.',
      'Dockerized API + worker services with monorepo structure (pnpm workspaces).',
      'In-progress — local dev stack fully configured.',
    ],
  },
  {
    id: 'nightanvil',
    name: 'NightAnvil — Freelancer Business Toolkit',
    tagline: 'Fiverr gig generator, invoices, Stripe payments',
    stack: ['Python', 'Flask', 'Stripe', 'PostgreSQL'],
    url: 'https://github.com/3m0h4ck3r/nightanvil',
    repo: 'https://github.com/3m0h4ck3r/nightanvil',
    images: [],
    detail: [
      'Complete Python/Flask toolkit for freelancers: AI-powered gig generation, PDF invoices with payment tracking, Stripe checkout + webhooks.',
      'Fiverr one-click gig sync, auth with secure sessions, dark neon brand UI, GitHub Actions CI/CD.',
      'Deployable to Railway with PostgreSQL + SQLAlchemy.',
    ],
  },
  {
    id: 'obsidian',
    name: 'Obsidian Platform — Bug Bounty Intelligence',
    tagline: 'Production-grade Go attack surface management',
    stack: ['Go', 'ASM', 'Recon'],
    url: 'https://github.com/3m0h4ck3r/obsidian-platform',
    repo: 'https://github.com/3m0h4ck3r/obsidian-platform',
    images: [],
    detail: [
      'Production-grade Go attack surface management platform for bug bounty programs.',
      'Hive-mind tier intelligence gathering: automated recon, scope monitoring, and target profiling.',
    ],
  },
  {
    id: 'bb-suite',
    name: 'bb-suite — Python Pentest Toolkit',
    tagline: 'Automated bug bounty reconnaissance',
    stack: ['Python', 'CLI'],
    url: 'https://github.com/geekhaus314',
    repo: 'https://github.com/geekhaus314',
    images: [],
    detail: [
      'Modular Python toolkit for bug bounty recon with config, data pipelines, and scoped files.',
      'Supports multiple reconnaissance modules with structured output for analysis.',
    ],
  },
  {
    id: 'south-city',
    name: 'South City Scooters — Redesign Preview',
    tagline: 'Client site redesign + rebrandable template kit',
    stack: ['Next.js', 'HTML/CSS/JS', 'Tailwind'],
    url: 'https://github.com/geekhaus314',
    repo: 'https://github.com/geekhaus314',
    images: [],
    detail: [
      'Next.js redesign for South City Scooters with a companion rebrandable template kit (template-kit).',
      'Static, themed, mobile-first HTML/CSS/JS templates with hero, services, testimonials, and contact sections.',
      'Built to pitch redesigns to potential clients — CSS-variable driven for instant rebranding.',
    ],
  },
  {
    id: 'viper',
    name: 'Viper-Web3 + PayloadsAllTheThings',
    tagline: 'Solidity + web security toolkits',
    stack: ['Solidity', 'Python', 'Security'],
    url: 'https://github.com/geekhaus314/Viper-Web3',
    repo: 'https://github.com/geekhaus314/Viper-Web3',
    images: [],
    detail: [
      'Viper-Web3: Solidity bug bounty toolkit for smart contract auditing.',
      'PayloadsAllTheThings fork maintained for web application security testing payloads and bypasses.',
    ],
  },
  {
    id: 'vercel-gateway',
    name: 'Vercel AI Gateway Demo',
    tagline: 'AI gateway routing and caching',
    stack: ['TypeScript', 'Vercel', 'AI'],
    url: 'https://github.com/geekhaus314/vercel-ai-gateway-demo',
    repo: 'https://github.com/geekhaus314/vercel-ai-gateway-demo',
    images: [],
    detail: [
      'Demo of AI gateway patterns on Vercel — routing, provider abstraction, and caching for LLM APIs.',
    ],
  },
]

function ProjectCarousel({ project, onClose }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % project.images.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + project.images.length) % project.images.length)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, project.images.length])

  const prev = () => setIndex((i) => (i - 1 + project.images.length) % project.images.length)
  const next = () => setIndex((i) => (i + 1) % project.images.length)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="lightbox-enter relative w-full max-w-4xl max-h-[90vh] bg-panel border border-bone/10 rounded-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-md bg-black/60 px-3 py-1.5 text-sm text-bone hover:bg-blood transition-colors"
          aria-label="Close"
        >
          Close ✕
        </button>

        <div className="p-6 border-b border-bone/10">
          <h3 className="font-serif text-2xl text-bone">{project.name}</h3>
          <p className="text-sm text-bone/60 mt-1">{project.tagline}</p>
        </div>

        {project.images.length > 0 ? (
          <>
            <div className="relative bg-black/40">
              <img
                src={project.images[index]}
                alt={`${project.name} screenshot ${index + 1}`}
                className="w-full max-h-[50vh] object-contain"
              />
              {project.images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-black/60 px-3 py-2 text-bone hover:bg-blood transition-colors"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-black/60 px-3 py-2 text-bone hover:bg-blood transition-colors"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {project.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          i === index ? 'bg-blood' : 'bg-bone/30 hover:bg-bone/60'
                        }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto p-4">
              {project.images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setIndex(i)}
                  className={`shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    i === index ? 'border-blood' : 'border-transparent hover:border-bone/40'
                  }`}
                >
                  <img src={img} alt="" className="h-16 w-28 object-cover" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-10 text-center text-bone/50 italic">
            Screenshots coming soon — this project is in active development.
          </div>
        )}

        <div className="p-6 border-t border-bone/10 space-y-3">
          {project.detail.map((line, i) => (
            <p key={i} className="text-sm text-bone/75 leading-relaxed">
              {line}
            </p>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-bone/20 px-3 py-1 text-xs text-bone/70"
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-3">
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-blood px-4 py-2 text-sm font-medium text-bone hover:opacity-90 transition-opacity"
              >
                Visit live site
              </a>
            )}
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-bone/25 px-4 py-2 text-sm font-medium text-bone/80 hover:border-bone transition-colors"
            >
              View code
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, onOpen }) {
  const cover = project.images[0]
  return (
    <button
      onClick={() => onOpen(project)}
      className="group text-left rounded-lg overflow-hidden border border-bone/10 bg-panel hover:border-blood/60 transition-colors"
    >
      <div className="aspect-[16/10] overflow-hidden bg-black/30 flex items-center justify-center">
        {cover ? (
          <img
            src={cover}
            alt={`${project.name} preview`}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="font-serif text-2xl text-bone/30 italic px-4 text-center">
            {project.name}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif text-xl text-bone group-hover:text-bone/90">{project.name}</h3>
        <p className="mt-1 text-sm text-bone/55">{project.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.stack.slice(0, 3).map((tech) => (
            <span key={tech} className="text-xs text-bone/45">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

function InstagramEmbed() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '//www.instagram.com/embed.js'
    script.async = true
    document.body.appendChild(script)
    return () => script.remove()
  }, [])

  return (
    <div className="mt-10 flex justify-center">
      <div
        className="max-w-[540px] w-full overflow-hidden rounded-lg border border-bone/10 bg-panel"
        dangerouslySetInnerHTML={{
          __html: `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this profile on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px;" target="_blank">Jake</a> (@<a href="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px;" target="_blank">pwn4g3.io</a>) &bull; Instagram photos and videos</p></div></blockquote>`,
        }}
      />
    </div>
  )
}

function GitHubStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('https://api.github.com/users/geekhaus314/repos?per_page=100&sort=updated')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((repos) => {
        const publicRepos = repos.filter((r) => !r.fork)
        setStats({
          repos: publicRepos.length,
          stars: publicRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0),
          languages: new Set(publicRepos.map((r) => r.language).filter(Boolean)).size,
        })
      })
      .catch(() => setStats(null))
  }, [])

  if (!stats) return null

  return (
    <div className="reveal mt-10 grid grid-cols-3 gap-4 max-w-xl mx-auto">
      <div className="rounded-lg border border-bone/10 bg-panel p-4 text-center">
        <p className="font-serif text-2xl text-bone">{stats.repos}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-bone/45">Public repos</p>
      </div>
      <div className="rounded-lg border border-bone/10 bg-panel p-4 text-center">
        <p className="font-serif text-2xl text-bone">{stats.stars}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-bone/45">GitHub stars</p>
      </div>
      <div className="rounded-lg border border-bone/10 bg-panel p-4 text-center">
        <p className="font-serif text-2xl text-bone">{stats.languages}</p>
        <p className="mt-1 text-xs uppercase tracking-wider text-bone/45">Languages</p>
      </div>
    </div>
  )
}

function BookingForm() {
  const [status, setStatus] = useState('idle')
  const [form, setForm] = useState({
    name: '',
    email: '',
    service: 'Full-stack development',
    timeline: '',
    details: '',
  })

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('sent')
      setForm({ name: '', email: '', service: 'Full-stack development', timeline: '', details: '' })
    } catch {
      setStatus('error')
    }
  }

  const emailHref = `mailto:geekhaus314@proton.me?subject=${encodeURIComponent(
    `Booking request — ${form.service}${form.timeline ? ` (${form.timeline})` : ''}`,
  )}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nService: ${form.service}\nTimeline: ${form.timeline}\n\n${form.details}`)}`

  const inputClass =
    'w-full rounded-md border border-bone/20 bg-panel px-4 py-2.5 text-sm text-bone placeholder:text-bone/35 focus:border-blood focus:outline-none transition-colors'

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bk-name" className="mb-1.5 block text-sm text-bone/70">Name</label>
          <input id="bk-name" required value={form.name} onChange={update('name')} placeholder="Your name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="bk-email" className="mb-1.5 block text-sm text-bone/70">Email</label>
          <input id="bk-email" type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" className={inputClass} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bk-service" className="mb-1.5 block text-sm text-bone/70">Service needed</label>
          <select id="bk-service" value={form.service} onChange={update('service')} className={inputClass}>
            <option>Full-stack development</option>
            <option>API development</option>
            <option>Web scraping / data</option>
            <option>Automation / scripting</option>
            <option>SEO / database configuration</option>
            <option>Security / firewall setup</option>
            <option>Site redesign / rebuild</option>
            <option>Something else</option>
          </select>
        </div>
        <div>
          <label htmlFor="bk-timeline" className="mb-1.5 block text-sm text-bone/70">Timeline</label>
          <input id="bk-timeline" value={form.timeline} onChange={update('timeline')} placeholder="ASAP, 2 weeks, flexible…" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="bk-details" className="mb-1.5 block text-sm text-bone/70">Project details</label>
        <textarea
          id="bk-details"
          required
          rows={5}
          value={form.details}
          onChange={update('details')}
          placeholder="Tell me what you're building…"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-blood px-6 py-3 text-sm font-medium text-bone hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {status === 'sending' ? 'Sending…' : 'Request a booking'}
      </button>
      {status === 'sent' && (
        <p className="text-center text-sm text-emerald-400">Booking request sent — I'll get back to you within a day.</p>
      )}
      {status === 'error' && (
        <div className="text-center">
          <p className="text-sm text-red-400">Something went wrong sending via the form.</p>
          <a
            href={emailHref}
            className="mt-3 inline-block rounded-md border border-bone/25 px-5 py-2.5 text-sm font-medium text-bone/80 hover:border-bone transition-colors"
          >
            Email me directly instead
          </a>
        </div>
      )}
    </form>
  )
}

export default function App() {
  const [activeProject, setActiveProject] = useState(null)

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        })
      },
      { threshold: 0.15 },
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-ink font-sans antialiased">
      <nav className="fixed top-0 inset-x-0 z-40 border-b border-bone/10 bg-ink/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="#top" className="font-serif text-xl tracking-tight text-bone">
            pwn4g3
          </a>
          <div className="hidden sm:flex items-center gap-6 text-sm text-bone/60">
            <a href="#about" className="hover:text-bone transition-colors">About</a>
            <a href="#portfolio" className="hover:text-bone transition-colors">Portfolio</a>
            <a href="#career" className="hover:text-bone transition-colors">Career</a>
            <a href="#booking" className="hover:text-bone transition-colors">Book</a>
          </div>
          <a
            href="mailto:geekhaus314@proton.me"
            className="rounded-md bg-blood px-4 py-1.5 text-sm font-medium text-bone hover:opacity-90 transition-opacity"
          >
            Hire me
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section id="top" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroPhoto}
            alt="Jake Viefhaus"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/70 to-ink" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-32 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-bone/50">Full-Stack Developer · St. Louis, MO</p>
          <div className="mt-4 font-mono text-sm text-bone/50">
            <span className="text-blood">[whoami]$</span> Jake Viefhaus (aka{' '}
            <a href="https://github.com/geekhaus314" target="_blank" rel="noopener noreferrer" className="text-bone underline decoration-bone/30 hover:text-blood transition-colors">
              @geekhaus314
            </a>{' '}on GitHub)
          </div>
          <h1 className="mt-4 font-serif text-5xl md:text-7xl font-light text-bone">
            pwn4g3
          </h1>
          <p className="mt-6 text-lg text-bone/70 max-w-2xl mx-auto leading-relaxed">
            I build full-stack web applications, APIs, automation, and secure infrastructure —
            from e-commerce platforms to bug bounty tooling.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#booking"
              className="rounded-md bg-blood px-6 py-3 text-sm font-medium text-bone hover:opacity-90 transition-opacity"
            >
              Book a project
            </a>
            <a
              href="#portfolio"
              className="rounded-md border border-bone/25 px-6 py-3 text-sm font-medium text-bone/80 hover:border-bone transition-colors"
            >
              See my work
            </a>
            <a
              href="https://github.com/geekhaus314"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-bone/25 px-6 py-3 text-sm font-medium text-bone/80 hover:border-bone transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 border-t border-bone/10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="reveal font-serif text-4xl font-light text-bone sm:text-5xl">About</h2>
          <div className="reveal mt-8 space-y-5 text-bone/70 leading-relaxed">
            <p>
              I'm Jake, a full-stack developer and cybersecurity engineering student based in
              St. Louis, Missouri — founder of pwn4g3. I build web applications, automate
              workflows, and help businesses make sense of their data.
            </p>
            <p>
              From multi-tenant e-commerce platforms to client sites for local businesses,
              AI revenue infrastructure to bug bounty tooling — I cover the whole stack:
              TypeScript, React, Vue, Python, Node, Go, SQL, scraping, APIs, automation,
              SEO configuration, and firewall/security work.
            </p>
            <p className="italic text-bone/50">
              I'm an optimist at heart — I believe the world can be whole again; I just say
              it with my eyes on the horizon instead of my mouth.
            </p>
            <ul className="space-y-2 text-sm text-bone/60">
              <li><strong className="text-bone/80">Location:</strong> St. Louis, MO</li>
              <li><strong className="text-bone/80">Born:</strong> December 5, 2000</li>
              <li><strong className="text-bone/80">Pronouns:</strong> he/him</li>
              <li><strong className="text-bone/80">Email:</strong> geekhaus314@proton.me</li>
            </ul>
            <InstagramEmbed />
            <GitHubStats />
            <div className="mt-10 flex justify-center">
              <div
                className="max-w-[540px] w-full overflow-hidden rounded-lg border border-bone/10 bg-panel"
                dangerouslySetInnerHTML={{
                  __html: `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">View this profile on Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px;" target="_blank">Jake</a> (@<a href="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px;" target="_blank">pwn4g3.io</a>) &bull; Instagram photos and videos</p></div></blockquote>`,
                }}
              />
              <script async src="//www.instagram.com/embed.js" />
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="portfolio" className="py-20 border-t border-bone/10">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="reveal font-serif text-4xl font-light text-bone sm:text-5xl">Portfolio</h2>
          <p className="reveal mt-3 text-bone/55">
            Selected projects — click any card to see the full breakdown and screenshots.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <div key={p.id} className="reveal">
                <ProjectCard project={p} onOpen={setActiveProject} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Career */}
      <section id="career" className="py-20 border-t border-bone/10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="reveal font-serif text-4xl font-light text-bone sm:text-5xl">Career</h2>
          <p className="reveal mt-3 text-bone/55">
            For recruiters and hiring managers — my goal, my standing, and my resume.
          </p>
          <div className="reveal mt-8 grid sm:grid-cols-2 gap-6">
            <div className="rounded-lg border border-bone/10 bg-panel p-6">
              <h3 className="font-serif text-xl text-bone">Career Goal</h3>
              <p className="mt-3 text-sm text-bone/70 leading-relaxed">
                To build a career at the intersection of full-stack development and
                cybersecurity — engineering secure, reliable web applications and
                infrastructure, while growing into security engineering and
                penetration testing. Currently finishing my B.S. in Computer
                Science / Cybersecurity Engineering (3.9 GPA, Dean's List every
                quarter, two semesters remaining) and open to part-time IT,
                web development, and security roles.
              </p>
            </div>
            <div className="rounded-lg border border-bone/10 bg-panel p-6 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-bone">Resume</h3>
                <p className="mt-3 text-sm text-bone/70 leading-relaxed">
                  One page, current, with live links to every project on this site.
                </p>
              </div>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-blood px-5 py-2.5 text-sm font-medium text-bone text-center hover:opacity-90 transition-opacity"
              >
                Download resume (PDF)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Booking */}
      <section id="booking" className="py-20 border-t border-bone/10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="reveal font-serif text-4xl font-light text-bone sm:text-5xl text-center">Book a project</h2>
          <p className="reveal mt-3 text-center text-bone/55">
            Tell me what you need — I'll get back to you within a day.
          </p>
          <div className="reveal mt-10">
            <BookingForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-bone/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-bone/40">
          <p>© {new Date().getFullYear()} pwn4g3 · Jake M. Viefhaus</p>
          <p className="text-xs text-bone/30">Co-conspirator: Thomas Ivie — graphic design, management, booking &amp; customer service</p>
          <div className="flex gap-5">
            <a href="https://github.com/geekhaus314" target="_blank" rel="noopener noreferrer" className="hover:text-bone transition-colors">GitHub</a>
            <a href="https://github.com/3m0h4ck3r" target="_blank" rel="noopener noreferrer" className="hover:text-bone transition-colors">3m0h4ck3r</a>
            <a href="https://gitlab.com/geekhaus314" target="_blank" rel="noopener noreferrer" className="hover:text-bone transition-colors">GitLab</a>
            <a href="mailto:geekhaus314@proton.me" className="hover:text-bone transition-colors">Email</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-6 text-center text-xs text-bone/25">
          {import.meta.env.VITE_GIT_SHA ? (
            <span>
              Deployed from{' '}
              <a
                href={`https://github.com/geekhaus314/geekhaus314.github.io/commit/${import.meta.env.VITE_GIT_SHA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-bone/20 hover:text-bone/50 transition-colors"
              >
                {import.meta.env.VITE_GIT_SHA.slice(0, 7)}
              </a>
              {' '}via GitHub Actions{import.meta.env.VITE_BUILD_TIME ? ` · ${new Date(import.meta.env.VITE_BUILD_TIME).toUTCString()}` : ''}
            </span>
          ) : (
            <span>Deployed via Cloudflare Pages</span>
          )}
        </div>
      </footer>

      {activeProject && <ProjectCarousel project={activeProject} onClose={() => setActiveProject(null)} />}
    </div>
  )
}