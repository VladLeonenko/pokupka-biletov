/**
 * Hero 3D: ядро (сфера/многогранник) + светящиеся «нейронные» связи.
 * Бирюзовый/фиолетовый/лайм. Реакция на скролл.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NEON_CYAN = 0x00d4ff;
const NEON_PURPLE = 0x9d4edd;
const NEON_LIME = 0x7fff00;

export function AITeamThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mobile = window.matchMedia('(max-width: 768px)').matches;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !mobile,
      powerPreference: mobile ? 'low-power' : 'default',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Ядро — icosahedron (многогранник)
    const coreGeo = new THREE.IcosahedronGeometry(0.5, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: NEON_CYAN,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Внутренняя сфера (glow)
    const glowGeo = new THREE.SphereGeometry(0.48, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: NEON_PURPLE,
      transparent: true,
      opacity: 0.12,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Нейронные связи — линии от ядра к точкам
    const lineCount = mobile ? 80 : 180;
    const lineColors = [NEON_CYAN, NEON_PURPLE, NEON_LIME];
    const linePositions: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      const r = 0.8 + Math.random() * 2;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      linePositions.push(0, 0, 0, x, y, z);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const colors: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const c = lineColors[i % lineColors.length];
      const r = (c >> 16) / 255;
      const g = ((c >> 8) & 0xff) / 255;
      const b = (c & 0xff) / 255;
      colors.push(r, g, b, r, g, b);
    }
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Мелкие ноды на концах линий
    const nodeCount = lineCount;
    const nodePositions = new Float32Array(nodeCount * 3);
    let idx = 0;
    for (let i = 0; i < lineCount; i++) {
      const j = i * 6 + 3;
      nodePositions[idx++] = linePositions[j];
      nodePositions[idx++] = linePositions[j + 1];
      nodePositions[idx++] = linePositions[j + 2];
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 0.04,
      color: NEON_CYAN,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const nodes = new THREE.Points(nodeGeo, nodeMat);
    scene.add(nodes);

    let raf: number;
    const animate = () => {
      const time = performance.now() * 0.001;
      core.rotation.y = time * 0.15;
      core.rotation.x = time * 0.08;
      glow.rotation.y = time * 0.1;
      lines.rotation.y = time * 0.06;
      nodes.rotation.y = time * 0.06;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      onUpdate: (self) => {
        const p = self.progress;
        const s = THREE.MathUtils.lerp(1, 0.3, p);
        core.scale.set(s, s, s);
        glow.scale.set(s, s, s);
        lines.scale.set(s, s, s);
        nodes.scale.set(s, s, s);
        const y = THREE.MathUtils.lerp(0, 2, p);
        core.position.y = y;
        glow.position.y = y;
        lines.position.y = y;
        nodes.position.y = y;
        coreMat.opacity = THREE.MathUtils.lerp(0.5, 0.08, p);
        glowMat.opacity = THREE.MathUtils.lerp(0.12, 0.03, p);
        lineMat.opacity = THREE.MathUtils.lerp(0.6, 0.1, p);
        nodeMat.opacity = THREE.MathUtils.lerp(0.8, 0.15, p);
      },
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      [coreGeo, coreMat, glowGeo, glowMat, lineGeo, lineMat, nodeGeo, nodeMat].forEach((o) => o.dispose?.());
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
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
        height: '100%',
        zIndex: -10,
        pointerEvents: 'none',
      }}
    />
  );
}
