import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export function Footer() {
  useEffect(() => {
    // Загрузка скрипта calltracking
    const ct = document.createElement('script');
    ct.type = 'text/javascript';
    ct.async = true;
    ct.rel = 'preload';
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
          // TODO: Заменить на правильный API endpoint
          const response = await fetch('/api/forms/submit', {
            method: 'POST',
            body: formData,
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
            <div className="social-icons d-flex jscb gap-h-20">
              <a href="https://wa.me/79999849107" target="_blank" rel="noopener noreferrer">
                <img src="/legacy/img/whatsapp.png" alt="whatsapp Primecoder" />
              </a>
              <a href="https://t.me/+79999849107" target="_blank" rel="noopener noreferrer">
                <img src="/legacy/img/telegram.png" alt="telegram Primecoder" />
              </a>
              <a href="https://vk.com/primecoder" target="_blank" rel="noopener noreferrer">
                <img src="/legacy/img/vk.png" alt="vk Primecoder" />
              </a>
            </div>
          </div>
          <div className="footer-nav d-flex jcsb pt-50 gap-h-30">
            <div className="col">
              <ul className="d-flex flex-column gap-v-20">
                <li><Link to="/about">О нас</Link></li>
                <li><Link to="/services">Услуги</Link></li>
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
              <a href="mailto:info@primecoder.ru">info@primecoder.ru</a>
              <h5>Телефон</h5>
              <a href="tel:+74951476577">+7 (495)-147-65-77</a>
            </div>
            <div className="col d-flex flex-column gap-v-20">
              <h3>Реализуем ваши идеи <br />в прибыльные проекты!</h3>
              <div className="btn-mode">
                <a href="#" className="btn submit-order">Оставить заявку</a>
              </div>
            </div>
          </div>
          <p className="pt-50">® PRIMECODER<br />
            2017-2024 Веб-студия разработки</p>
        </div>
      </footer>
    </>
  );
}

