import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Sidebar.css';

function Sidebar() {
  return (
    <aside className="admin-sidebar">
      <h2>Админ-панель</h2>
      <nav>
        <ul>
          <li><NavLink to="/" end>Главная</NavLink></li>
          <li><NavLink to="/pages">Страницы</NavLink></li>
          <li><NavLink to="/blog">Блог</NavLink></li>
          <li><NavLink to="/seo">SEO</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
}
export default Sidebar;
