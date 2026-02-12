import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 3D сфера из частиц с текстом-надписью.
 * При скролле: уменьшается и перемещается, текст меняется на заголовок текущего блока.
 * Вдохновлено follow.art + референс (wireframe sphere из мелких точек).
 */

const SECTION_LABELS = [
  'PRIMECODER',
  'КАЛЬКУЛЯТОР',
  'УСЛУГИ',
  'КЕЙСЫ',
  'ПРЕИМУЩЕСТВА',
  'WORKFLOW',
  'О НАС',
  'ОТЗЫВЫ',
  'БЛОГ',
];

interface ParticleSphereProps {
  /** Селектор контейнера с [data-scroll-label] (h2/h3). Если задан — подписи берутся из блоков статьи */
  labelsFromSelector?: string;
}

export function ParticleSphere({ labelsFromSelector }: ParticleSphereProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Three.js setup ---
    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Particle sphere geometry ---
    const PARTICLE_COUNT = 3000;
    const RADIUS = 1.4;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);

    // Fibonacci sphere distribution for even spacing
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_COUNT);

      const x = RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = RADIUS * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.012,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // --- Organic noise deformation ---
    let time = 0;
    const noiseStrength = 0.08;

    function deform() {
      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];

        // Simple 3D noise approximation
        const n =
          Math.sin(ox * 3.0 + time * 0.6) * Math.cos(oy * 2.5 + time * 0.4) * Math.sin(oz * 2.0 + time * 0.5);

        const factor = 1.0 + n * noiseStrength;
        pos[i * 3] = ox * factor;
        pos[i * 3 + 1] = oy * factor;
        pos[i * 3 + 2] = oz * factor;
      }
      geometry.attributes.position.needsUpdate = true;
    }

    // --- Animation loop ---
    let raf: number;
    function animate() {
      time += 0.008;
      deform();
      points.rotation.y += 0.001;
      points.rotation.x += 0.0003;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    // --- Resize ---
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // --- GSAP ScrollTrigger: shrink + move + label change ---
    const wrapper = container.parentElement || container;
    const sections = document.querySelectorAll<HTMLElement>('[data-scroll-section]');

    // Global scroll progress: sphere continuously changes through whole page
    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      onUpdate: (self) => {
        const p = self.progress; // 0 → 1

        // Phase 1 (0-20%): shrink from 1 → 0.4, move to top-right
        // Phase 2 (20-50%): drift left, scale breathe 0.4→0.3
        // Phase 3 (50-75%): move center-right, scale up slightly 0.3→0.45
        // Phase 4 (75-100%): drift to bottom-right, shrink 0.45→0.25

        let s: number, xOff: number, yOff: number;

        if (p < 0.2) {
          const t = p / 0.2;
          s = THREE.MathUtils.lerp(1, 0.4, t);
          xOff = THREE.MathUtils.lerp(0, 1.8, t);
          yOff = THREE.MathUtils.lerp(0, 0.8, t);
        } else if (p < 0.5) {
          const t = (p - 0.2) / 0.3;
          s = THREE.MathUtils.lerp(0.4, 0.3, t);
          xOff = THREE.MathUtils.lerp(1.8, -1.2, t);
          yOff = THREE.MathUtils.lerp(0.8, 0.4, t);
        } else if (p < 0.75) {
          const t = (p - 0.5) / 0.25;
          s = THREE.MathUtils.lerp(0.3, 0.45, t);
          xOff = THREE.MathUtils.lerp(-1.2, 1.5, t);
          yOff = THREE.MathUtils.lerp(0.4, -0.3, t);
        } else {
          const t = (p - 0.75) / 0.25;
          s = THREE.MathUtils.lerp(0.45, 0.25, t);
          xOff = THREE.MathUtils.lerp(1.5, 2.0, t);
          yOff = THREE.MathUtils.lerp(-0.3, -0.8, t);
        }

        points.scale.set(s, s, s);
        points.position.x = xOff;
        points.position.y = yOff;
      },
    });

    // Per-section label change
    const setupLabelTriggers = (labelElements: HTMLElement[], labels: string[]) => {
      if (!labelRef.current || labels.length === 0) return;
      const defaultLabel = labels[0] || SECTION_LABELS[0];
      labelRef.current.textContent = defaultLabel;
      labelElements.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => {
            if (labelRef.current) {
              gsap.to(labelRef.current, { opacity: 0, duration: 0.2, onComplete: () => {
                if (labelRef.current) {
                  labelRef.current.textContent = labels[i] || defaultLabel;
                  gsap.to(labelRef.current, { opacity: 1, duration: 0.3 });
                }
              } });
            }
          },
          onEnterBack: () => {
            if (labelRef.current) {
              gsap.to(labelRef.current, { opacity: 0, duration: 0.2, onComplete: () => {
                if (labelRef.current) {
                  labelRef.current.textContent = i > 0 ? labels[i - 1] : defaultLabel;
                  gsap.to(labelRef.current, { opacity: 1, duration: 0.3 });
                }
              } });
            }
          },
        });
      });
    };

    let labelTimeoutId: ReturnType<typeof setTimeout> | undefined;
    if (labelRef.current) {
      if (labelsFromSelector) {
        labelTimeoutId = setTimeout(() => {
          const labelEls = document.querySelectorAll<HTMLElement>(
            `${labelsFromSelector} [data-scroll-label], ${labelsFromSelector} h2, ${labelsFromSelector} h3`
          );
          const labels = Array.from(labelEls).map((el) => el.getAttribute('data-scroll-label') || el.textContent?.trim().slice(0, 60) || '');
          if (labels.length > 0) {
            setupLabelTriggers(Array.from(labelEls), labels);
          } else {
            sections.forEach((section, i) => {
              ScrollTrigger.create({
                trigger: section,
                start: 'top 60%',
                end: 'bottom 40%',
                onEnter: () => {
                  if (labelRef.current) {
                    gsap.to(labelRef.current, { opacity: 0, duration: 0.2, onComplete: () => {
                      if (labelRef.current) {
                        labelRef.current.textContent = SECTION_LABELS[i + 1] || '';
                        gsap.to(labelRef.current, { opacity: 1, duration: 0.3 });
                      }
                    } });
                  }
                },
                onEnterBack: () => {
                  if (labelRef.current) {
                    gsap.to(labelRef.current, { opacity: 0, duration: 0.2, onComplete: () => {
                      if (labelRef.current) {
                        labelRef.current.textContent = SECTION_LABELS[i] || SECTION_LABELS[0];
                        gsap.to(labelRef.current, { opacity: 1, duration: 0.3 });
                      }
                    } });
                  }
                },
              });
            });
          }
        }, 400);
      } else {
        sections.forEach((section, i) => {
          ScrollTrigger.create({
            trigger: section,
            start: 'top 60%',
            end: 'bottom 40%',
            onEnter: () => {
              if (labelRef.current) {
                gsap.to(labelRef.current, { opacity: 0, duration: 0.2, onComplete: () => {
                  if (labelRef.current) {
                    labelRef.current.textContent = SECTION_LABELS[i + 1] || '';
                    gsap.to(labelRef.current, { opacity: 1, duration: 0.3 });
                  }
                } });
              }
            },
            onEnterBack: () => {
              if (labelRef.current) {
                gsap.to(labelRef.current, { opacity: 0, duration: 0.2, onComplete: () => {
                  if (labelRef.current) {
                    labelRef.current.textContent = SECTION_LABELS[i] || SECTION_LABELS[0];
                    gsap.to(labelRef.current, { opacity: 1, duration: 0.3 });
                  }
                } });
              }
            },
          });
        });
      }
    }

    // --- Cleanup ---
    return () => {
      if (labelTimeoutId) clearTimeout(labelTimeoutId);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: -5,
        pointerEvents: 'none',
      }}
    >
      {/* Floating label around the sphere */}
      <div
        ref={labelRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
          fontWeight: 800,
          fontFamily: '"Raleway", sans-serif',
          color: 'rgba(255,255,255,0.08)',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'font-size 0.3s',
        }}
      >
        PRIMECODER
      </div>
    </div>
  );
}
