/**
 * AI Boost Team: сфера частиц — фиксированный цвет, движение по скроллу.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COL_CYAN = 0x00e5ff;
const COL_MAGENTA = 0xc77dff;

function scrollProgress01(): number {
  const vh = window.innerHeight;
  const maxY = Math.max(1, document.documentElement.scrollHeight - vh);
  return THREE.MathUtils.clamp(window.scrollY / maxY, 0, 1);
}

export function AITeamEditorialThreeBackground() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x06060a, mobile ? 0.034 : 0.02);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 140);
    camera.position.set(0, 0.25, 8.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !mobile,
      powerPreference: mobile ? 'low-power' : 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    const maxDpr = mobile ? 1 : Math.min(window.devicePixelRatio, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(maxDpr);
    };
    resize();
    el.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x334055, 0.45);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.65);
    dir.position.set(4, 10, 6);
    scene.add(dir);
    const ptA = new THREE.PointLight(COL_CYAN, mobile ? 0.7 : 1.2, 28, 2);
    ptA.position.set(5, 1, 4);
    scene.add(ptA);
    const ptB = new THREE.PointLight(COL_MAGENTA, mobile ? 0.6 : 1.0, 26, 2);
    ptB.position.set(-5, -2, 3);
    scene.add(ptB);

    const disposables: { dispose: () => void }[] = [];

    const gHero = new THREE.Group();
    scene.add(gHero);

    const PARTICLE_COUNT = mobile ? 880 : 3600;
    const RADIUS = 1.38 * 1.5;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);
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
    const heroGeo = new THREE.BufferGeometry();
    heroGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const heroMat = new THREE.PointsMaterial({
      size: mobile ? 0.028 : 0.022,
      color: COL_CYAN,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const heroPoints = new THREE.Points(heroGeo, heroMat);
    gHero.add(heroPoints);
    disposables.push({ dispose: () => { heroGeo.dispose(); heroMat.dispose(); } });

    const noiseStrength = mobile ? 0.06 : 0.085;
    const timeStep = mobile ? 0.004 : 0.008;
    const rotStep = mobile ? 0.00045 : 0.00095;

    let mouseX = 0;
    let mouseY = 0;
    let tmx = 0;
    let tmy = 0;
    const onMove = (e: MouseEvent) => {
      tmx = (e.clientX / Math.max(w, 1)) * 2 - 1;
      tmy = (e.clientY / Math.max(h, 1)) * 2 - 1;
    };
    if (!mobile) window.addEventListener('mousemove', onMove);

    let raf = 0;
    const clock = new THREE.Clock();
    let simT = 0;

    const tick = () => {
      const t = clock.getElapsedTime();
      simT += timeStep;
      if (!mobile) {
        mouseX += (tmx - mouseX) * 0.035;
        mouseY += (tmy - mouseY) * 0.035;
      }

      const rawP = scrollProgress01();
      const sm = rawP * rawP * (3 - 2 * rawP);

      const xSweep = Math.cos(sm * Math.PI * 2);
      const xAmpSweep = mobile ? 1.15 : 1.85;
      const xBias = mobile ? 0.2 : 0.42;
      gHero.position.x = xSweep * xAmpSweep + xBias;

      const yAmp = mobile ? 0.65 : 1.15;
      gHero.position.y = THREE.MathUtils.lerp(0.95 * yAmp, -1.05 * yAmp, sm);
      gHero.position.z = THREE.MathUtils.lerp(0, -0.35, sm);

      gHero.scale.setScalar(THREE.MathUtils.lerp(1.12, 0.78, sm));

      const posArr = heroGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];
        const n =
          Math.sin(ox * 3.0 + simT * 0.6) * Math.cos(oy * 2.5 + simT * 0.4) * Math.sin(oz * 2.0 + simT * 0.5);
        const factor = 1.0 + n * noiseStrength;
        posArr[i * 3] = ox * factor;
        posArr[i * 3 + 1] = oy * factor;
        posArr[i * 3 + 2] = oz * factor;
      }
      heroGeo.attributes.position.needsUpdate = true;

      const scrollBoost = 0.35 + 0.65 * (1 - sm);
      heroPoints.rotation.y += rotStep * 1.05 * scrollBoost;
      heroPoints.rotation.x += rotStep * 0.34 * scrollBoost;

      const camParallaxX = (mobile ? 0 : mouseX * 0.38) + gHero.position.x * 0.18;
      const camParallaxY =
        (mobile ? 0 : -mouseY * 0.24) + 0.22 + gHero.position.y * 0.12 + Math.sin(t * 0.18) * 0.04;
      camera.position.x = camParallaxX;
      camera.position.y = camParallaxY;
      camera.position.z = 8.15 - sm * 0.35;
      camera.lookAt(
        gHero.position.x * 0.45,
        gHero.position.y * 0.45 - 0.06,
        -0.35,
      );

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (!mobile) window.removeEventListener('mousemove', onMove);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
