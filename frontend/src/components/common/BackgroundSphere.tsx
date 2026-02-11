import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useLocation } from 'react-router-dom';

/**
 * Лёгкая сфера из частиц на не-главных страницах.
 * Справа вверху, медленно вращается. На главной не показываем (там ParticleSphere).
 */
export function BackgroundSphere() {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isHomepage = location.pathname === '/' || location.pathname === '';

  useEffect(() => {
    if (isHomepage) return;

    const container = ref.current;
    if (!container) return;

    const size = 300;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const count = 1000;
    const pos = new Float32Array(count * 3);
    const golden = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < count; i++) {
      const theta = (2 * Math.PI * i) / golden;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      pos[i * 3] = Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = Math.cos(phi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.015,
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.0008;
      points.rotation.x += 0.0003;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isHomepage]);

  if (isHomepage) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 30,
        right: 30,
        width: 300,
        height: 300,
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.45,
      }}
    />
  );
}
