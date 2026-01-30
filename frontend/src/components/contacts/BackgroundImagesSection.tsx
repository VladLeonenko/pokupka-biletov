/**
 * Секция с фоновыми изображениями на странице /contacts
 */
export function BackgroundImagesSection() {
  return (
    <div className="bg-image">
      <img
        className="bg-sphere"
        src="/legacy/img/gray-bg-sphere.png"
        alt="gray-bg-sphere PrimeCoder"
        loading="lazy"
      />
      <img
        className="bg-sphere-small"
        src="/legacy/img/gray-bg-sphere-small.png"
        alt="gray-bg-sphere-small PrimeCoder"
        loading="lazy"
      />
    </div>
  );
}

