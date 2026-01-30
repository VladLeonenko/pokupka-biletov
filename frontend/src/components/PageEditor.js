import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, TextField, Button, Select, MenuItem } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { quillModules, pageTemplates } from '../quillConfig';
import { getApiBase } from '@/utils/apiBase';

function PageEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = slug === 'new';

  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    body: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Реф для доступа к редактору ReactQuill
  const quillRef = useRef(null);

  useEffect(() => {
    if (!isNew) {
      const API_BASE = getApiBase();
      fetch(`${API_BASE}/api/pages/${slug}`)
        .then(res => res.json())
        .then(data => setFormData(data))
        .catch(console.error);
    }
  }, [slug, isNew]);

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBodyChange = (value) => {
    setFormData({ ...formData, body: value });
  };

  const handleTemplateChange = (e) => {
    const template = pageTemplates.find(t => t.name === e.target.value);
    setSelectedTemplate(e.target.value);
    if (template) {
      setFormData({ ...formData, body: template.value });
    }
  };

  // Обработчик выбора файла для загрузки картинки
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      // Вставляем изображение в редактор по текущей позиции курсора
      quill.insertEmbed(range.index, 'image', reader.result);
      quill.setSelection(range.index + 1);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // Очистить input после загрузки
  };

  const handleSubmit = e => {
    e.preventDefault();
    const API_BASE = getApiBase();
    if (isNew) {
      fetch(`${API_BASE}/api/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
        .then(() => navigate('/pages'))
        .catch(console.error);
    } else {
      fetch(`${API_BASE}/api/pages/${formData.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
        .then(() => navigate('/pages'))
        .catch(console.error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        {isNew ? 'Добавить страницу' : `Редактировать: ${formData.slug}`}
      </Typography>
      <form onSubmit={handleSubmit} autoComplete="off">
        <TextField
          fullWidth
          margin="normal"
          required
          label="Slug"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          disabled={!isNew}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Заголовок"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />
        <Typography sx={{ mt: 2 }}>Шаблон страницы:</Typography>
        <Select
          value={selectedTemplate}
          onChange={handleTemplateChange}
          fullWidth
          sx={{ mb: 2 }}
        >
          {pageTemplates.map(t => (
            <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem>
          ))}
        </Select>
        <Typography sx={{ mt: 2 }}>HTML-контент:</Typography>

        {/* Кнопка загрузки картинки */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ marginBottom: 10 }}
        />

        <ReactQuill
          value={formData.body}
          onChange={handleBodyChange}
          theme="snow"
          modules={quillModules}
          ref={quillRef}
          style={{ height: '250px', marginBottom: '30px' }}
        />

        <Typography variant="subtitle1" sx={{ mt: 2 }}>SEO данные</Typography>
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

export default PageEditor;
