import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBlogCategory, deleteBlogCategory, listBlogCategories } from '@/services/cmsApi';
import { Box, Button, Grid, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState } from 'react';
import { useToast } from '@/components/common/ToastProvider';

export function BlogCategoriesPage() {
  const { data: categories = [] } = useQuery({ queryKey: ['blog-categories'], queryFn: listBlogCategories });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');

  const create = useMutation({
    mutationFn: () => createBlogCategory(slug.trim(), name.trim() || slug.trim()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blog-categories'] }); setSlug(''); setName(''); showToast('Категория сохранена', 'success'); },
    onError: (e: any) => showToast(e?.message || 'Ошибка сохранения', 'error')
  });
  const del = useMutation({
    mutationFn: (s: string) => deleteBlogCategory(s),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blog-categories'] }); showToast('Категория удалена', 'success'); },
    onError: (e: any) => showToast(e?.message || 'Ошибка удаления', 'error')
  });

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Категории блога</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField label="Slug" fullWidth size="small" value={slug} onChange={(e) => setSlug(e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField label="Название" fullWidth size="small" value={name} onChange={(e) => setName(e.target.value)} /></Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="contained" onClick={() => slug.trim() && create.mutate()}>Сохранить</Button>
            <Button sx={{ ml: 1 }} onClick={() => { setSlug('category-seo'); setName('SEO продвижение'); }}>Добавить SEO продвижение</Button>
            <Button sx={{ ml: 1 }} onClick={async () => {
              try {
                const presets = [
                  { slug: 'category-seo', name: 'SEO продвижение' },
                  { slug: 'category-it', name: 'Разработчикам' },
                  { slug: 'category-design', name: 'Дизайнерам' },
                  { slug: 'category-marketing', name: 'Маркетологам' },
                ];
                for (const p of presets) {
                  // sequential to keep order and avoid flooding
                  // eslint-disable-next-line no-await-in-loop
                  await createBlogCategory(p.slug, p.name);
                }
                queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
                showToast('Стартовые категории добавлены', 'success');
              } catch (e: any) {
                showToast(e?.message || 'Ошибка добавления пресетов', 'error');
              }
            }}>Добавить стартовые темы</Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Slug</TableCell>
              <TableCell>Название</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.slug} hover>
                <TableCell>{c.slug}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell align="right">
                  <IconButton color="error" onClick={() => del.mutate(c.slug)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}


