import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TextField, Button, Container, Typography } from '@mui/material';
import { getApiBase } from '@/utils/apiBase';

function EditPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
  });

  useEffect(() => {
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/api/pages/${slug}`)
      .then(res => res.json())
      .then(data => {
        setPage(data);
        setFormData(data);
      })
      .catch(console.error);
  }, [slug]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/api/pages/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(() => alert('Страница обновлена!'))
      .catch(console.error);
  };

  if (!page) return <div>Загрузка...</div>;

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Редактирование страницы: {slug}
      </Typography>
      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        <TextField
          fullWidth
          margin="normal"
          label="Заголовок"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          multiline
          rows={4}
          margin="normal"
          label="Тело страницы"
          name="body"
          value={formData.body}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="SEO заголовок"
          name="seo_title"
          value={formData.seo_title}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="SEO описание"
          name="seo_description"
          value={formData.seo_description}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="SEO ключевые слова"
          name="seo_keywords"
          value={formData.seo_keywords}
          onChange={handleChange}
        />
        <Button variant="contained" color="primary" type="submit" sx={{ mt: 2 }}>
          Сохранить
        </Button>
      </form>
    </Container>
  );
}

export default EditPage;
