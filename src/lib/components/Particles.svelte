<script lang="ts">
	import { onMount } from "svelte";

	// Drifting specks at three depths. Scrolling moves the near ones faster than the far
	// ones (parallax), and the cursor strings the closest ones together. They belong to
	// the hero: they fade out as it scrolls away, and stop drawing once they're gone.
	let canvas = $state<HTMLCanvasElement>();

	type Speck = { x: number; y: number; z: number; vx: number; vy: number; hue: number };

	onMount(() => {
		const context = canvas?.getContext("2d");
		if (!canvas || !context) {
			return;
		}
		const still = matchMedia("(prefers-reduced-motion: reduce)");
		let width = 0;
		let height = 0;
		let specks: Speck[] = [];
		let colours: string[] = [];
		let pointer: { x: number; y: number } | undefined;
		let frame = 0;
		// the parallax trails the real scroll position, so the specks glide instead of snap
		let eased = scrollY;

		function readColours() {
			const style = getComputedStyle(document.documentElement);
			colours = ["--color-accent", "--color-cool", "--color-hot"].map((name) =>
				style.getPropertyValue(name).trim(),
			);
		}

		function resize() {
			if (!canvas) {
				return;
			}
			const ratio = Math.min(devicePixelRatio, 2);
			width = innerWidth;
			height = innerHeight;
			canvas.width = width * ratio;
			canvas.height = height * ratio;
			context?.setTransform(ratio, 0, 0, ratio, 0, 0);
			// ponytail: density scales with the viewport, capped so a 4K screen stays cheap
			const total = Math.min(140, Math.round((width * height) / 12000));
			specks = Array.from({ length: total }, () => ({
				x: Math.random() * width,
				y: Math.random() * height,
				z: 0.25 + Math.random() * 0.75,
				vx: (Math.random() - 0.5) * 0.15,
				vy: -0.05 - Math.random() * 0.2,
				hue: Math.floor(Math.random() * 3),
			}));
		}

		function draw() {
			if (!context) {
				return;
			}
			eased += (scrollY - eased) * (still.matches ? 1 : 0.08);
			const scroll = eased;
			const fade = Math.max(0, 1 - scroll / (height * 0.75));
			if (canvas) {
				canvas.style.opacity = String(fade);
			}
			if (!fade) {
				return;
			}
			context.clearRect(0, 0, width, height);
			const placed = specks.map((speck) => {
				speck.x = (speck.x + speck.vx * speck.z + width) % width;
				speck.y = (speck.y + speck.vy * speck.z + height) % height;
				const y = (((speck.y - scroll * speck.z * 0.35) % height) + height) % height;
				return { x: speck.x, y, speck };
			});
			for (const { x, y, speck } of placed) {
				context.globalAlpha = 0.25 + speck.z * 0.55;
				context.fillStyle = colours[speck.hue] ?? "#888";
				context.beginPath();
				context.arc(x, y, speck.z * 1.8, 0, Math.PI * 2);
				context.fill();
			}
			if (pointer) {
				const { x: px, y: py } = pointer;
				context.lineWidth = 0.6;
				for (const { x, y, speck } of placed) {
					const distance = Math.hypot(x - px, y - py);
					if (distance < 160) {
						context.globalAlpha = (1 - distance / 160) * 0.6;
						context.strokeStyle = colours[speck.hue] ?? "#888";
						context.beginPath();
						context.moveTo(px, py);
						context.lineTo(x, y);
						context.stroke();
					}
				}
			}
			context.globalAlpha = 1;
		}

		function loop() {
			draw();
			frame = requestAnimationFrame(loop);
		}

		function start() {
			cancelAnimationFrame(frame);
			if (still.matches) {
				draw();
			} else {
				loop();
			}
		}

		const onMove = (event: PointerEvent) => {
			pointer = { x: event.clientX, y: event.clientY };
		};
		const onLeave = () => {
			pointer = undefined;
		};
		// reduced motion draws one frame, not a loop: scrolling still has to fade it
		const onScroll = () => {
			if (still.matches) {
				draw();
			}
		};
		const onResize = () => {
			resize();
			start();
		};
		// the theme button flips data-theme: pick the new accent colours up
		const themes = new MutationObserver(readColours);
		themes.observe(document.documentElement, { attributeFilter: ["data-theme"] });
		const scheme = matchMedia("(prefers-color-scheme: dark)");

		readColours();
		resize();
		start();
		addEventListener("resize", onResize);
		addEventListener("scroll", onScroll, { passive: true });
		addEventListener("pointermove", onMove);
		document.addEventListener("pointerleave", onLeave);
		scheme.addEventListener("change", readColours);
		still.addEventListener("change", start);

		return () => {
			cancelAnimationFrame(frame);
			themes.disconnect();
			removeEventListener("resize", onResize);
			removeEventListener("scroll", onScroll);
			removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerleave", onLeave);
			scheme.removeEventListener("change", readColours);
			still.removeEventListener("change", start);
		};
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none fixed inset-0 -z-1 size-full" aria-hidden="true"></canvas>
