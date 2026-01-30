/**
 * Секция с социальными сетями на странице /contacts
 */
export function SocialNetworkSection() {
  return (
    <div className="social-network mt-150">
      <a href="https://www.instagram.com/primecoder" target="_blank" rel="noopener noreferrer">
        <img src="/legacy/img/instagram-icon.png" alt="instagram-icon Primecoder" loading="lazy" />
      </a>
      <a href="https://vk.com/primecoder" target="_blank" rel="noopener noreferrer">
        <img src="/legacy/img/vk-icon-white.png" alt="vk-icon Primecoder" loading="lazy" />
      </a>
      <a href="https://t.me/+79999849107" target="_blank" rel="noopener noreferrer">
        <img src="/legacy/img/telegram-icon-white.png" alt="telegram-icon Primecoder" loading="lazy" />
      </a>
      <a href="https://wa.me/79999849107" target="_blank" rel="noopener noreferrer">
        <img src="/legacy/img/whatsapp-icon-white.png" alt="whatsapp-icon Primecoder" loading="lazy" />
      </a>
    </div>
  );
}

