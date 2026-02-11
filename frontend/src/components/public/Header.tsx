import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { EcommerceHeaderIcons } from './EcommerceHeaderIcons';
import gsap from 'gsap';
import './Header.css';

interface MenuItem {
  to: string;
  label: string;
  preview?: string; // short label for rotating text
}

const MENU_ITEMS: MenuItem[][] = [
  [
    { to: '/catalog', label: 'Каталог услуг', preview: 'КАТАЛОГ' },
    { to: '/ai-team', label: 'AI Boost Team', preview: 'AI TEAM' },
    { to: '/ai-chat', label: 'AI Ассистент', preview: 'AI CHAT' },
    { to: '/portfolio', label: 'Кейсы', preview: 'КЕЙСЫ' },
  ],
  [
    { to: '/about', label: 'О нас', preview: 'О НАС' },
    { to: '/new-client', label: 'Стать клиентом', preview: 'КЛИЕНТ' },
    { to: '/promotion', label: 'Акции и скидки', preview: 'АКЦИИ' },
    { to: '/blog', label: 'Блог', preview: 'БЛОГ' },
  ],
  [
    { to: '/charity', label: 'Благотворительность', preview: 'CHARITY' },
    { to: '/reviews', label: 'Отзывы', preview: 'ОТЗЫВЫ' },
    { to: '/contacts', label: 'Контакты', preview: 'КОНТАКТЫ' },
  ],
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<MenuItem | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const iconWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hoveredItem || !iconWrapRef.current) return;
    const el = iconWrapRef.current;
    gsap.killTweensOf(el);
    gsap.set(el, { scale: 0.4, opacity: 0, rotation: -90 });
    gsap.to(el, { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.2)' });
    const pulse = gsap.to(el, { scale: 1.08, duration: 0.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    return () => {
      gsap.killTweensOf(el);
      pulse.kill();
    };
  }, [hoveredItem]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMenuOpen && !target.closest('.menu') && !target.closest('.burger-menu') && target.id !== 'burger-toggle') {
        setIsMenuOpen(false);
        const checkbox = document.getElementById('burger-toggle') as HTMLInputElement;
        if (checkbox) checkbox.checked = false;
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const handleBurgerToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsMenuOpen(e.target.checked);
    if (!e.target.checked) setHoveredItem(null);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setHoveredItem(null);
    const checkbox = document.getElementById('burger-toggle') as HTMLInputElement;
    if (checkbox) checkbox.checked = false;
  };

  return (
    <header>
      <div className="d-flex container header jcsb align-items-center">
        <div className="col-md-2 col-sm-3 col-xs-8">
          <div className="logo ptb-22">
            <Link to="/">
              <img src="/legacy/img/logo.png" alt="логотип PrimeCoder" />
            </Link>
          </div>
        </div>

        <div className="ecommerce-icons-container-global">
          <EcommerceHeaderIcons />
        </div>

        <input
          type="checkbox"
          id="burger-toggle"
          checked={isMenuOpen}
          onChange={handleBurgerToggle}
        />
        <label htmlFor="burger-toggle" className="burger-menu">
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </label>

        <div className={`menu ${isMenuOpen ? 'active' : ''}`}>
          <div className="menu-inner">
            <div className="container pt-100">
              <div className="d-flex main-menu-nav">
                {MENU_ITEMS.map((col, colIdx) => (
                  <div key={colIdx} className="col-33 menu-col">
                    <ul className="d-flex gap-v-20 flex-column menu-navigation">
                      {col.map((item) => (
                        <li
                          key={item.to}
                          onMouseEnter={() => setHoveredItem(item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className="menu-item-wrapper"
                        >
                          <Link to={item.to} onClick={closeMenu} className="menu-link-styled">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Hover preview — rotating text circle */}
              <div
                ref={previewRef}
                className={`menu-hover-preview ${hoveredItem ? 'visible' : ''}`}
              >
                {hoveredItem && (
                  <>
                    <div className="preview-circle">
                      <svg viewBox="0 0 200 200" className="rotating-text-svg">
                        <defs>
                          <path
                            id="circlePath"
                            d="M 100,100 m -75,0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                          />
                        </defs>
                        <text>
                          <textPath href="#circlePath" className="circle-text">
                            {`${hoveredItem.preview} · `.repeat(4)}
                          </textPath>
                        </text>
                      </svg>
                      <div className="preview-inner">
                        <div className="preview-icon-wrap" ref={iconWrapRef}>
                          <ArrowForwardRoundedIcon sx={{ fontSize: 36, color: '#ffbb00' }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="footer-header d-flex jcsb mt-100">
                <div className="social-icons social-icons-circle d-flex jscb gap-h-20">
                  <a href="https://wa.me/79999849107" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                  <a href="https://t.me/+79999849107" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  </a>
                  <a href="https://vk.com/primecoder" target="_blank" rel="noopener noreferrer" aria-label="VK">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>
                  </a>
                  <a href="https://www.linkedin.com/company/primecoder" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  </a>
                  <a href="https://pinterest.com/primecoder" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>
                  </a>
                </div>
              </div>
              <div className="footer-nav d-flex jcsb pt-50 gap-h-30">
                <div className="col">
                  <h5>График работы</h5>
                  <p>Пн-Пт с 9:00 по 22:00</p>
                </div>
                <div className="col">
                  <h5>Почта</h5>
                  <a href="mailto:info@prime-coder.ru">info@prime-coder.ru</a>
                </div>
                <div className="col d-flex flex-column">
                  <h5>Адрес</h5>
                  <p>Москва, ул. Земляной Вал, 50Ас5</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar buttons */}
      <div className="btn-sidebar">
        <a href="https://t.me/+79999849107" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <g filter="url(#filter0_ddii_1262_15618)">
              <circle cx="32" cy="36" r="25" fill="#1D1D1D"/>
              <circle cx="32" cy="36" r="24.5" stroke="url(#paint0_linear_1262_15618)"/>
            </g>
            <path fillRule="evenodd" clipRule="evenodd" d="M52.6668 35.833C52.6668 47.3389 43.3394 56.6663 31.8335 56.6663C20.3276 56.6663 11.0001 47.3389 11.0001 35.833C11.0001 24.3271 20.3276 14.9997 31.8335 14.9997C43.3394 14.9997 52.6668 24.3271 52.6668 35.833ZM24.9511 33.9246C22.8641 34.8358 20.7198 35.7721 18.759 36.8521C17.7352 37.6017 19.0959 38.132 20.3726 38.6294L20.3757 38.6306C20.5776 38.7093 20.7773 38.7871 20.9651 38.8649C21.1223 38.9132 21.282 38.9641 21.4439 39.0156C22.8638 39.468 24.4469 39.9724 25.8254 39.2136C28.0896 37.913 30.2262 36.4093 32.3614 34.9068L32.362 34.9063C33.0616 34.414 33.761 33.9218 34.4646 33.4369C34.4976 33.4158 34.5348 33.3917 34.5755 33.3654C35.1749 32.9767 36.523 32.1029 36.0243 33.307C34.8463 34.5954 33.5845 35.7359 32.3158 36.8827L32.3122 36.886C31.4563 37.6595 30.5973 38.4359 29.7587 39.2623C29.0284 39.8557 28.27 41.049 29.0878 41.88C30.9691 43.1969 32.8798 44.4821 34.7894 45.7665L34.7963 45.7711C35.4184 46.1895 36.0406 46.6079 36.6614 47.0274C37.7137 47.8675 39.3582 47.1879 39.5895 45.8751C39.6897 45.2868 39.7904 44.6986 39.891 44.1103L39.899 44.0635C40.4698 40.7261 41.0408 37.3874 41.5453 34.0392C41.6138 33.5139 41.6915 32.9887 41.7693 32.4633L41.7694 32.4624C41.9579 31.1891 42.1465 29.9144 42.2054 28.6343C42.0535 27.3565 40.5042 27.6375 39.6421 27.9248C35.2105 29.6111 30.8231 31.4224 26.4532 33.2656C25.9581 33.4849 25.4563 33.704 24.9511 33.9246Z" fill="#1D1D1D"/>
            <path d="M24.9511 33.9246C22.8641 34.8358 20.7198 35.7721 18.759 36.8521C17.7352 37.6017 19.0959 38.132 20.3726 38.6294L20.3757 38.6306C20.5776 38.7093 20.7773 38.7871 20.9651 38.8649C21.1223 38.9132 21.282 38.9641 21.4439 39.0156C22.8638 39.468 24.4469 39.9724 25.8254 39.2136C28.0896 37.913 30.2262 36.4093 32.3614 34.9068L32.362 34.9063C33.0616 34.414 33.761 33.9218 34.4646 33.4369C34.4976 33.4158 34.5348 33.3917 34.5755 33.3654C35.1749 32.9767 36.523 32.1029 36.0243 33.307C34.8463 34.5954 33.5845 35.7359 32.3158 36.8827L32.3122 36.886C31.4563 37.6595 30.5973 38.4359 29.7587 39.2623C29.0284 39.8557 28.27 41.049 29.0878 41.88C30.9691 43.1969 32.8798 44.4821 34.7894 45.7665L34.7963 45.7711C35.4184 46.1895 36.0406 46.6079 36.6614 47.0274C37.7137 47.8675 39.3582 47.1879 39.5895 45.8751C39.6897 45.2868 39.7904 44.6986 39.891 44.1103L39.899 44.0635C40.4698 40.7261 41.0408 37.3874 41.5453 34.0392C41.6138 33.5139 41.6915 32.9887 41.7693 32.4633L41.7694 32.4624C41.9579 31.1891 42.1465 29.9144 42.2054 28.6343C42.0535 27.3565 40.5042 27.6375 39.6421 27.9248C35.2105 29.6111 30.8231 31.4224 26.4532 33.2656C25.9581 33.4849 25.4563 33.704 24.9511 33.9246Z" fill="#434343"/>
            <defs>
              <filter id="filter0_ddii_1262_15618" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="2"/><feGaussianBlur stdDeviation="0.5"/><feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0.0291667 0 0 0 0 0.0291667 0 0 0 0 0.0291667 0 0 0 1 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1262_15618"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="-4"/><feGaussianBlur stdDeviation="3.5"/><feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="effect2_dropShadow_1262_15618" result="shape"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="3" dy="1"/><feGaussianBlur stdDeviation="6"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0.0833333 0 0 0 0 0.0833333 0 0 0 0 0.0833333 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="shape" result="effect3_innerShadow_1262_15618"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="-2"/><feGaussianBlur stdDeviation="2"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                <feBlend mode="normal" in2="effect3_innerShadow_1262_15618" result="effect4_innerShadow_1262_15618"/>
              </filter>
              <linearGradient id="paint0_linear_1262_15618" x1="40.5" y1="58" x2="17.5" y2="15.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#232323"/><stop offset="1" stopColor="#232323" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </a>
        <a href="https://wa.me/79999849107" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <g filter="url(#filter0_ddii_1262_15446)">
              <circle cx="32" cy="36" r="25" fill="#1D1D1D"/>
              <circle cx="32" cy="36" r="24.5" stroke="url(#paint0_linear_1262_15446)"/>
            </g>
            <path fillRule="evenodd" clipRule="evenodd" d="M31.6667 52.3333C22.4619 52.3333 15 44.8714 15 35.6667C15 26.4619 22.4619 19 31.6667 19C40.8714 19 48.3333 26.4619 48.3333 35.6667C48.3333 44.8714 40.8714 52.3333 31.6667 52.3333ZM32.216 44.9392C37.6802 44.937 42.1243 40.4919 42.1265 35.0288C42.1275 32.3808 41.0976 29.8908 39.2265 28.0176C37.3554 26.1444 34.8671 25.1123 32.2159 25.1111C26.7533 25.1111 22.3075 29.5567 22.3053 35.021C22.3046 36.7677 22.7609 38.4726 23.6282 39.9756L22.2222 45.1111L27.4759 43.733C28.9235 44.5225 30.5533 44.9387 32.2119 44.9392H32.216Z" fill="#434343"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M27.7193 41.9389L24.6016 42.7568L25.4338 39.7171L25.2379 39.4054C24.4134 38.094 23.9779 36.5782 23.9785 35.0217C23.9803 30.4801 27.6756 26.7852 32.2192 26.7852C34.4194 26.7859 36.4875 27.6438 38.0427 29.2008C39.5979 30.7578 40.4539 32.8274 40.4531 35.0284C40.4513 39.5704 36.7561 43.2656 32.2159 43.2656H32.2126C30.7345 43.2651 29.2848 42.868 28.0201 42.1175L27.7193 41.9389ZM37.2088 37.3856C37.1469 37.2823 36.9819 37.2204 36.7342 37.0964C36.4866 36.9724 35.2691 36.3734 35.0421 36.2907C34.8152 36.2081 34.65 36.1668 34.485 36.4147C34.3199 36.6625 33.8453 37.2204 33.7009 37.3856C33.5564 37.5509 33.412 37.5716 33.1644 37.4476C32.9168 37.3237 32.1189 37.0622 31.173 36.2185C30.4368 35.5619 29.9399 34.751 29.7954 34.5031C29.651 34.2552 29.78 34.1212 29.904 33.9977C30.0154 33.8867 30.1516 33.7084 30.2754 33.5639C30.3992 33.4193 30.4405 33.3159 30.5231 33.1508C30.6056 32.9855 30.5643 32.8409 30.5024 32.7169C30.4405 32.593 29.9453 31.3741 29.7389 30.8783C29.5379 30.3954 29.3338 30.4608 29.1818 30.4532C29.0375 30.4459 28.8722 30.4444 28.7072 30.4444C28.5421 30.4444 28.2738 30.5064 28.0468 30.7543C27.8198 31.0022 27.1801 31.6013 27.1801 32.8201C27.1801 34.039 28.0675 35.2165 28.1913 35.3818C28.3151 35.5471 29.9374 38.0483 32.4215 39.1209C33.0123 39.376 33.4735 39.5284 33.8332 39.6425C34.4264 39.831 34.9663 39.8044 35.3929 39.7406C35.8687 39.6696 36.858 39.1416 37.0644 38.5632C37.2707 37.9847 37.2707 37.4889 37.2088 37.3856Z" fill="#434343"/>
            <defs>
              <filter id="filter0_ddii_1262_15446" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="2"/><feGaussianBlur stdDeviation="0.5"/><feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0.0291667 0 0 0 0 0.0291667 0 0 0 0 0.0291667 0 0 0 1 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1262_15446"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="-4"/><feGaussianBlur stdDeviation="3.5"/><feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="effect2_dropShadow_1262_15446" result="shape"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="3" dy="1"/><feGaussianBlur stdDeviation="6"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0.0833333 0 0 0 0 0.0833333 0 0 0 0 0.0833333 0 0 0 0.25 0"/>
                <feBlend mode="normal" in2="shape" result="effect3_innerShadow_1262_15446"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dx="-2"/><feGaussianBlur stdDeviation="2"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                <feBlend mode="normal" in2="effect3_innerShadow_1262_15446" result="effect4_innerShadow_1262_15446"/>
              </filter>
              <linearGradient id="paint0_linear_1262_15446" x1="40.5" y1="58" x2="17.5" y2="15.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#232323"/><stop offset="1" stopColor="#232323" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </a>
        <div className="phoneEmail">
          <a href="mailto:info@prime-coder.ru" aria-label="Email">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path d="M23.75 5H6.25C5.25544 5 4.30161 5.39509 3.59835 6.09835C2.89509 6.80161 2.5 7.75544 2.5 8.75V21.25C2.5 22.2446 2.89509 23.1984 3.59835 23.9017C4.30161 24.6049 5.25544 25 6.25 25H23.75C24.7446 25 25.6984 24.6049 26.4016 23.9017C27.1049 23.1984 27.5 22.2446 27.5 21.25V8.75C27.5 7.75544 27.1049 6.80161 26.4016 6.09835C25.6984 5.39509 24.7446 5 23.75 5ZM6.25 7.5H23.75C24.0815 7.5 24.3995 7.6317 24.6339 7.86612C24.8683 8.10054 25 8.41848 25 8.75L15 14.85L5 8.75C5 8.41848 5.1317 8.10054 5.36612 7.86612C5.60054 7.6317 5.91848 7.5 6.25 7.5ZM25 21.25C25 21.5815 24.8683 21.8995 24.6339 22.1339C24.3995 22.3683 24.0815 22.5 23.75 22.5H6.25C5.91848 22.5 5.60054 22.3683 5.36612 22.1339C5.1317 21.8995 5 21.5815 5 21.25V11.6L14.35 17.3125C14.54 17.4222 14.7556 17.48 14.975 17.48C15.1944 17.48 15.41 17.4222 15.6 17.3125L25 11.6V21.25Z" fill="#434343"/>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
