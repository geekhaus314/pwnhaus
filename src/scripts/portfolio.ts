const cards = [...document.querySelectorAll<HTMLElement>('[data-project]')];
const dialog = document.querySelector<HTMLDialogElement>('#project-dialog');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

window.addEventListener('portfolio-theme', (event) => {
	const name = (event as CustomEvent<string>).detail;
	document.documentElement.dataset.theme = name;
	localStorage.setItem('pwn4g3-theme', name);
});

const savedTheme = localStorage.getItem('pwn4g3-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((button) => button.addEventListener('click', () => {
	document.querySelector('[data-filter].active')?.classList.remove('active');
	button.classList.add('active');
	const filter = button.dataset.filter;
	cards.forEach((card) => {
		const visible = filter === 'All' || card.dataset.type === filter;
		card.hidden = !visible;
		card.classList.toggle('is-filtered', !visible);
	});
}));

const openProject = (card: HTMLElement) => {
	if (!dialog) return;
	document.querySelector<HTMLElement>('#modal-type')!.textContent = card.dataset.type ?? '';
	document.querySelector<HTMLElement>('#modal-title')!.textContent = card.dataset.name ?? '';
	document.querySelector<HTMLElement>('#modal-tagline')!.textContent = card.dataset.tagline ?? '';
	const modalImage = document.querySelector<HTMLImageElement>('#modal-image')!;
	const image = card.dataset.image;
	modalImage.hidden = !image;
	if (image) {
		modalImage.src = image;
		modalImage.alt = `${card.dataset.name ?? 'Project'} screenshot`;
	}
	document.querySelector<HTMLElement>('#modal-detail')!.textContent = card.dataset.detail ?? '';
	document.querySelector<HTMLElement>('#modal-tags')!.innerHTML = (card.dataset.stack ?? '').split('|').map((item) => `<span>${item}</span>`).join('');
	const url = card.dataset.url ? `<a class="button primary" href="${card.dataset.url}" target="_blank" rel="noreferrer">Live project ↗</a>` : '';
	document.querySelector<HTMLElement>('#modal-actions')!.innerHTML = `${url}<a class="button ghost" href="${card.dataset.repo}" target="_blank" rel="noreferrer">Source code ↗</a>`;
	dialog.showModal();
};

cards.forEach((card) => {
	card.addEventListener('click', () => openProject(card));
	card.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openProject(card);
		}
	});
});

document.querySelector<HTMLButtonElement>('.modal-close')?.addEventListener('click', () => dialog?.close());
document.querySelectorAll<HTMLAnchorElement>('.nav a[href^="#"]').forEach((link) => link.addEventListener('click', () => {
	document.querySelector('.nav a.current')?.classList.remove('current');
	link.classList.add('current');
}));

const viperEndpoint = 'https://pwn4g3-site-backend.pwn4g3.workers.dev/api/viper-web3/analyze';
const viperSource = document.querySelector<HTMLTextAreaElement>('#solidity-source');
const viperAnalyze = document.querySelector<HTMLButtonElement>('#viper-analyze');
const viperStatus = document.querySelector<HTMLElement>('#viper-status');
const viperCount = document.querySelector<HTMLElement>('#viper-count');
const viperFindings = document.querySelector<HTMLElement>('#viper-findings');

viperAnalyze?.addEventListener('click', async () => {
	if (!viperSource || !viperStatus || !viperCount || !viperFindings) return;
	const source = viperSource.value.trim();
	if (!source) {
		viperStatus.textContent = 'ERROR / SOURCE REQUIRED';
		return;
	}
	viperAnalyze.disabled = true;
	viperStatus.textContent = 'RUNNING / TRIAGE';
	try {
		const response = await fetch(viperEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ source })
		});
		const result = await response.json() as { findings?: Array<{ id: string; severity: string; title: string; recommendation: string }>; summary?: { findingCount: number }; error?: string };
		if (!response.ok) throw new Error(result.error ?? 'analysis_failed');
		const findings = result.findings ?? [];
		viperCount.textContent = `${result.summary?.findingCount ?? findings.length} finding${findings.length === 1 ? '' : 's'}`;
		viperFindings.replaceChildren();
		if (!findings.length) {
			const empty = document.createElement('p');
			empty.className = 'viper-empty';
			empty.textContent = 'No heuristic signals matched. This is not proof of safety.';
			viperFindings.append(empty);
		} else {
			findings.forEach((finding) => {
				const item = document.createElement('article');
				item.className = 'viper-finding';
				item.innerHTML = `<span>${finding.severity.toUpperCase()} / ${finding.id}</span><strong>${finding.title}</strong><p>${finding.recommendation}</p>`;
				viperFindings.append(item);
			});
		}
		viperStatus.textContent = 'COMPLETE / READ-ONLY';
	} catch (error) {
		viperStatus.textContent = 'ERROR / SERVICE UNAVAILABLE';
		viperCount.textContent = 'Request failed';
		const message = document.createElement('p');
		message.className = 'viper-empty';
		message.textContent = error instanceof Error ? error.message : 'Unable to reach the Viper-Web3 service.';
		viperFindings.replaceChildren(message);
	} finally {
		viperAnalyze.disabled = false;
	}
});

if (!reduceMotion) {
	const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
		if (entry.isIntersecting) {
			entry.target.classList.add('revealed');
			observer.unobserve(entry.target);
		}
	}), { threshold: 0.12 });
	document.querySelectorAll<HTMLElement>('.section, .manifesto, .project-card, .cap').forEach((element) => {
		element.classList.add('reveal');
		observer.observe(element);
	});

	window.addEventListener('pointermove', (event) => {
		document.documentElement.style.setProperty('--pointer-x', `${event.clientX}px`);
		document.documentElement.style.setProperty('--pointer-y', `${event.clientY}px`);
	});
}
