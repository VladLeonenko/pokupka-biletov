import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const BLACK = [0.06, 0.06, 0.08];
const CYAN = [0.2, 0.95, 1];
const WHITE = [0.98, 0.98, 0.99];
const GREY = [0.6, 0.62, 0.65];

function getColorFromPixel(r: number, g: number, b: number, a: number): number[] | null {
  if (a < 60) return null;
  const brightness = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);

  if (r < 90 && g < 90 && b < 110 && brightness < 130) return BLACK;
  if (b > g + 20 && g > r && (b > 180 || (b > 140 && g > 100))) return CYAN;
  if (brightness > 200 && sat < 70) return WHITE;
  if (brightness > 170 && sat < 100) return WHITE;
  if (brightness > 100 && brightness < 190 && sat < 100) return GREY;
  if (brightness < 110) return BLACK;
  return null;
}

function isBackground(r: number, g: number, b: number, a: number): boolean {
  if (a < 50) return true;
  const brightness = (r + g + b) / 3;
  if (brightness < 25) return true;
  return brightness > 240 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
}

/**
 * Tesla Optimus из частиц — семплирование из референсного изображения.
 * Максимальное сходство, детализация, качество.
 */
export function ParticleRobotBust() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const size = 1040;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 2.8);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setReady(true);
        return;
      }

      const iw = img.width;
      const ih = img.height;
      canvas.width = iw;
      canvas.height = ih;
      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, iw, ih).data;
      const step = iw > 400 ? 2 : 1;
      const scaleX = 1.1 / iw;
      const scaleY = 1.0 / ih;

      for (let py = 0; py < ih; py += step) {
        for (let px = 0; px < iw; px += step) {
          const i = (py * iw + px) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (isBackground(r, g, b, a)) continue;

          const rgb = getColorFromPixel(r, g, b, a);
          if (!rgb) continue;

          const x = (px / iw - 0.5) * 2 * scaleX * iw;
          const y = (1 - py / ih) * scaleY * ih;
          const z = (Math.random() - 0.5) * 0.06;

          positions.push(x, y, z);
          colors.push(rgb[0], rgb[1], rgb[2]);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

      const pointTexture = (() => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d')!;
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
        g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
      })();

      const material = new THREE.PointsMaterial({
        size: 0.005,
        map: pointTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
        depthWrite: false,
      });

      const points = new THREE.Points(geometry, material);
      const group = new THREE.Group();
      group.scale.x = -1;
      group.add(points);
      scene.add(group);

      const logoResources: { geom?: THREE.PlaneGeometry; mat?: THREE.MeshBasicMaterial; tex?: THREE.Texture } = {};
      const loader = new THREE.TextureLoader();
      loader.load('/legacy/img/logo.png', (logoTexture) => {
        logoTexture.colorSpace = THREE.SRGBColorSpace;
        const logoGeom = new THREE.PlaneGeometry(0.16, 0.08);
        const logoMat = new THREE.MeshBasicMaterial({
          map: logoTexture,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const logoMesh = new THREE.Mesh(logoGeom, logoMat);
        logoMesh.position.set(0, 0.28, 0.07);
        logoMesh.scale.set(-1, 1, 1);
        group.add(logoMesh);
        logoResources.geom = logoGeom;
        logoResources.mat = logoMat;
        logoResources.tex = logoTexture;
      });

      setReady(true);

      let raf: number;
      function animate() {
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      animate();

      const onResize = () => {
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        renderer.setSize(size, size);
      };
      window.addEventListener('resize', onResize);

      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        geometry.dispose();
        material.dispose();
        pointTexture.dispose();
        logoResources.geom?.dispose();
        logoResources.mat?.dispose();
        logoResources.tex?.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    img.onerror = () => setReady(true);
    img.src = '/legacy/img/optimus-reference.png';

    return () => {
      img.src = '';
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: 1040,
        height: 1040,
        flexShrink: 0,
        pointerEvents: 'none',
        opacity: ready ? 0.95 : 0,
        minWidth: 1040,
        minHeight: 1040,
      }}
      aria-hidden="true"
    />
  );
}
