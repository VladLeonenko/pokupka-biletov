import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';

function Sidebar() {
  return (
    <aside className="admin-sidebar">
      <h2>Админ-панель</h2>
      <nav>
        <ul>
          <li><NavLink to="/admin" end>Дашборд</NavLink></li>
          
          <li className="sidebar-section">Контент</li>
          <li><NavLink to="/admin/pages">Страницы</NavLink></li>
          <li><NavLink to="/admin/blog">Блог</NavLink></li>
          <li><NavLink to="/admin/blog/categories">Категории блога</NavLink></li>
          
          <li className="sidebar-section">Портфолио</li>
          <li><NavLink to="/admin/cases">Кейсы</NavLink></li>
          
          <li className="sidebar-section">E-commerce</li>
          <li><NavLink to="/admin/products">Продукты</NavLink></li>
          <li><NavLink to="/admin/product-categories">Категории продуктов</NavLink></li>
          <li><NavLink to="/admin/promotions">Акции</NavLink></li>
          
          <li className="sidebar-section">Маркетинг</li>
          <li><NavLink to="/admin/carousels">Карусели</NavLink></li>
          <li><NavLink to="/admin/forms">Формы</NavLink></li>
          
          <li className="sidebar-section">CRM</li>
          <li><NavLink to="/admin/clients">Клиенты</NavLink></li>
          <li><NavLink to="/admin/funnels">Воронки</NavLink></li>
          
          <li className="sidebar-section">Настройки</li>
          <li><NavLink to="/admin/seo">SEO</NavLink></li>
          <li><NavLink to="/admin/team">Команда</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
}
export default Sidebar;
