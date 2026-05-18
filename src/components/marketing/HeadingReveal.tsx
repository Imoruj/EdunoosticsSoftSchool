"use client";

import { useEffect } from "react";

function isDescendantOf(el: HTMLElement, ancestors: Set<Element>): boolean {
    let p = el.parentElement;
    while (p) {
        if (ancestors.has(p)) return true;
        p = p.parentElement;
    }
    return false;
}

export function HeadingReveal() {
    useEffect(() => {
        const layout = document.querySelector<HTMLElement>(".mkt-layout");
        if (!layout) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLElement).classList.add("mkt-revealed");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
        );

        layout.querySelectorAll<HTMLElement>("section").forEach((section) => {
            // ── Step 1: Detect card grid containers ──────────────────────
            const cardChildren = new Set<Element>();

            section.querySelectorAll<HTMLElement>("div").forEach((div) => {
                const style = div.getAttribute("style") ?? "";
                if (!style.includes("grid") && !style.includes("flex")) return;
                const kids = Array.from(div.children) as HTMLElement[];
                if (kids.length < 2) return;

                const isCardGrid = kids.some((k) => {
                    const ks = k.getAttribute("style") ?? "";
                    return ks.includes("border") && ks.includes("border-radius");
                });
                if (!isCardGrid) return;

                let dominated = false;
                let par = div.parentElement;
                while (par && par !== section) {
                    if (cardChildren.has(par)) { dominated = true; break; }
                    par = par.parentElement;
                }
                if (dominated) return;

                kids.forEach((card, i) => {
                    cardChildren.add(card);
                    card.classList.add("mkt-reveal");
                    card.style.setProperty("--mkt-delay", `${i * 0.09}s`);
                    observer.observe(card);
                });
            });

            // ── Step 1b: Detect 2-column split layouts ────────────────────
            // These get left/right directional slide-ins instead of a plain fade-up.
            const splitChildren = new Set<Element>();

            section.querySelectorAll<HTMLElement>("div").forEach((div) => {
                const style = div.getAttribute("style") ?? "";
                if (!style.includes("grid") && !style.includes("flex")) return;
                const kids = Array.from(div.children) as HTMLElement[];
                if (kids.length !== 2) return;
                // Both children must be block-level divs
                if (kids.some((k) => k.tagName !== "DIV")) return;
                // At least one column must contain a heading (guards against small flex rows)
                if (!kids.some((k) => k.querySelector("h1,h2,h3"))) return;
                // Not a card grid
                if (kids.some((k) => {
                    const ks = k.getAttribute("style") ?? "";
                    return ks.includes("border") && ks.includes("border-radius");
                })) return;
                // Not nested inside an already-detected split or card grid
                if (isDescendantOf(div, splitChildren) || isDescendantOf(div, cardChildren)) return;

                kids[0].classList.add("mkt-reveal", "mkt-reveal--left");
                kids[0].style.setProperty("--mkt-delay", "0s");
                kids[1].classList.add("mkt-reveal", "mkt-reveal--right");
                kids[1].style.setProperty("--mkt-delay", "0.08s");
                splitChildren.add(kids[0]);
                splitChildren.add(kids[1]);
                observer.observe(kids[0]);
                observer.observe(kids[1]);
            });

            // ── Step 2: Animate headings and paragraphs outside card/split children ──
            const contentEls = Array.from(
                section.querySelectorAll<HTMLElement>("h1, h2, h3, h4, p")
            ).filter((el) => !isDescendantOf(el, cardChildren) && !isDescendantOf(el, splitChildren));

            contentEls.forEach((el, i) => {
                const tag = el.tagName.toLowerCase();
                el.style.setProperty("--mkt-delay", `${i * 0.06}s`);
                if (tag === "h3" || tag === "h4") {
                    el.classList.add("mkt-reveal");
                }
                observer.observe(el);
            });

            // ── Step 3: Animate standalone CTAs (links/buttons outside cards/splits) ──
            Array.from(section.querySelectorAll<HTMLElement>("a, button"))
                .filter((el) => {
                    if (cardChildren.has(el) || isDescendantOf(el, cardChildren)) return false;
                    if (isDescendantOf(el, splitChildren)) return false;
                    const style = el.getAttribute("style") ?? "";
                    return style.includes("border-radius") && style.includes("padding");
                })
                .forEach((el, i) => {
                    el.classList.add("mkt-reveal");
                    el.style.setProperty("--mkt-delay", `${(contentEls.length + i) * 0.06}s`);
                    observer.observe(el);
                });
        });

        // Belt-and-suspenders: after one frame, immediately reveal anything already
        // in the viewport that the async observer callback hasn't fired for yet.
        const raf = requestAnimationFrame(() => {
            const vh = window.innerHeight;
            layout.querySelectorAll<HTMLElement>(
                "h1, h2, h3, h4, section p, .mkt-reveal"
            ).forEach((el) => {
                if (el.classList.contains("mkt-revealed")) return;
                const { top, bottom } = el.getBoundingClientRect();
                if (top < vh && bottom > 0) {
                    el.classList.add("mkt-revealed");
                    observer.unobserve(el);
                }
            });
        });

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, []);

    return null;
}
