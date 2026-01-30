import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';
import { getApiBase } from '@/utils/apiBase';

function PagesList() {
  const [pages, setPages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Загрузка списка страниц с backend API
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/api/pages`)
      .then(res => {
        if (!res.ok) throw new Error('Ошибка загрузки страниц');
        return res.json();
      })
      .then(data => setPages(data))
      .catch(err => alert(err.message));
  }, []);

  const handleEdit = (slug) => {
    navigate(`/pages/edit/${slug}`);
  };

  const handleDelete = (slug) => {
    if (window.confirm('Удалить эту страницу?')) {
      const API_BASE = getApiBase();
      fetch(`${API_BASE}/api/pages/${slug}`, { method: 'DELETE' })
        .then(res => {
          if (!res.ok) throw new Error('Ошибка удаления страницы');
          setPages(pages.filter(page => page.slug !== slug));
        })
        .catch(err => alert(err.message));
    }
  };

  const handleAdd = () => {
    navigate('/pages/edit/new');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Список страниц</Typography>
      <Button variant="contained" color="primary" onClick={handleAdd} sx={{ mb: 2 }}>
        Добавить страницу
      </Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Заголовок</TableCell>
            <TableCell>Slug</TableCell>
            <TableCell>SEO заголовок</TableCell>
            <TableCell>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pages.map(({ slug, title, seo_title }) => (
            <TableRow key={slug}>
              <TableCell>{title}</TableCell>
              <TableCell>{slug}</TableCell>
              <TableCell>{seo_title}</TableCell>
              <TableCell>
                <Button onClick={() => handleEdit(slug)} sx={{ mr: 1 }}>Редактировать</Button>
                <Button color="error" onClick={() => handleDelete(slug)}>Удалить</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}

export default PagesList;
