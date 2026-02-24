import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  useEffect(() => {
    // Загрузка скрипта calltracking
    const ct = document.createElement('script');
    ct.type = 'text/javascript';
    ct.async = true;
    // rel не поддерживается для script элементов
    ct.src = `${document.location.protocol}//cc.calltracking.ru/phone.0c80c.13070.async.js?nc=${Math.floor(new Date().getTime() / 300000)}`;
    const s = document.getElementsByTagName('script')[0];
    if (s && s.parentNode) {
      s.parentNode.insertBefore(ct, s);
    }

    // Обработчики для формы обратной связи
    const submitForm = document.getElementById('submit-input') as HTMLFormElement;
    const submitPopup = document.getElementById('submitForm');
    const closePopup = document.querySelector('.closePopup');
    const submitOrder = document.querySelector('.submit-order');

    const formSend = async (e: Event) => {
      e.preventDefault();
      if (!submitForm) return;

      const formReq = submitForm.querySelectorAll('._req-s');
      let error = 0;

      formReq.forEach((input) => {
        const el = input as HTMLInputElement;
        el.parentElement?.classList.remove('_error');
        el.classList.remove('_error');
        if (el.value === '') {
          el.parentElement?.classList.add('_error');
          el.classList.add('_error');
          error++;
        }
      });

      if (error === 0) {
        submitForm.classList.add('_sending');
        const formData = new FormData(submitForm);

        try {
          const formObj: Record<string, string> = {};
          formData.forEach((v, k) => { formObj[k] = String(v); });
          const response = await fetch('/api/forms/submit/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formObj),
          });

          if (response.ok) {
            const result = await response.json();
            alert(result.message || 'Заявка отправлена');
            submitForm.reset();
            submitForm.classList.remove('_sending');
            submitPopup?.classList.remove('show_popup');
          } else {
            alert('Ошибка отправки формы');
            submitForm.classList.remove('_sending');
          }
        } catch (err) {
          alert('Ошибка отправки формы');
          submitForm.classList.remove('_sending');
        }
      } else {
        alert('Заполните обязательные поля');
      }
    };

    if (submitForm) {
      submitForm.addEventListener('submit', formSend);
    }

    if (submitOrder) {
      submitOrder.addEventListener('click', (e) => {
        e.preventDefault();
        submitPopup?.classList.toggle('show_popup');
      });
    }

    if (closePopup) {
      closePopup.addEventListener('click', (e) => {
        e.preventDefault();
        submitPopup?.classList.remove('show_popup');
      });
    }

    return () => {
      if (submitForm) {
        submitForm.removeEventListener('submit', formSend);
      }
    };
  }, []);

  return (
    <>
      {/* Форма обратной связи (popup) */}
      <div id="submitForm">
        <a href="#" className="closePopup">
          <img src="/legacy/img/close-icon.svg" alt="close-window" />
        </a>
        <h2>Оставить заявку</h2>
        <form action="" className="mt-20 d-flex flex-column" id="submit-input">
          <div className="form-item">
            <input type="text" className="mt-15 _req-s" placeholder="Введите имя" name="name" />
          </div>
          <div className="form-item">
            <input type="tel" className="mt-15 _req-s" placeholder="Введите номер телефона" name="tel" />
          </div>
          <button type="submit" className="btn-outline mt-30">Отправить</button>
        </form>
      </div>

      <footer className="pt-100">
        <div className="container">
          <div className="footer-header d-flex jcsb">
            <Link to="/">
              <img src="/legacy/img/logo.png" alt="Логотип Primecoder" />
            </Link>
            <div className="social-icons d-flex jscb gap-h-20 social-icons-circle">
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
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://pinterest.com/primecoder" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>
              </a>
            </div>
          </div>
          <div className="footer-nav d-flex jcsb pt-50 gap-h-30">
            <div className="col">
              <ul className="d-flex flex-column gap-v-20">
                <li><Link to="/about">О нас</Link></li>
                <li><Link to="/catalog">Каталог услуг</Link></li>
                <li><Link to="/portfolio">Наши кейсы</Link></li>
                <li><Link to="/contacts">Контакты</Link></li>
              </ul>
            </div>
            <div className="col">
              <ul className="d-flex flex-column gap-v-20">
                <li><Link to="/promotion">Акции и скидки</Link></li>
                <li><Link to="/reviews">Отзывы</Link></li>
                <li><Link to="/blog">Блог</Link></li>
                <li><Link to="/politic">Политика конфиденциальности</Link></li>
              </ul>
            </div>
            <div className="col d-flex flex-column gap-v-20">
              <h5>Почта</h5>
              <a href="mailto:info@prime-coder.ru">info@prime-coder.ru</a>
              <h5>Телефон</h5>
              <a href="tel:+79999849107">+7 (999) 984-91-07</a>
            </div>
            <div className="col d-flex flex-column gap-v-20">
              <h3>Реализуем ваши идеи <br />в прибыльные проекты!</h3>
              <div className="btn-mode">
                <a href="#" className="btn submit-order">Оставить заявку</a>
              </div>
            </div>
          </div>
          <p className="pt-50">® PRIMECODER<br />
            2017-2026 Веб-студия разработки</p>
        </div>
      </footer>
    </>
  );
}

