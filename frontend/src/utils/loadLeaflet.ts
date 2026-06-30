type LeafletApi = {
  map: (el: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  circleMarker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletLayer;
  latLngBounds: (latlngs: [number, number][]) => LeafletBounds;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: LeafletBounds, options?: { padding?: [number, number]; maxZoom?: number }) => LeafletMap;
  remove: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (html: string, options?: { maxWidth?: number }) => LeafletMarker;
  openPopup: () => LeafletMarker;
  on: (event: string, handler: () => void) => LeafletMarker;
  remove: () => void;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  remove: () => void;
};

type LeafletBounds = unknown;

let leafletPromise: Promise<LeafletApi> | null = null;

export function loadLeaflet(): Promise<LeafletApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no_window'));
  }
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const w = window as Window & { L?: LeafletApi };
    if (w.L) {
      resolve(w.L);
      return;
    }

    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet-css', '1');
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (w.L) resolve(w.L);
      else reject(new Error('leaflet_load_failed'));
    };
    script.onerror = () => reject(new Error('leaflet_script_error'));
    document.head.appendChild(script);
  });

  return leafletPromise;
}
