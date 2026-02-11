import { Box, TextField, Button, IconButton, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  BlogBlock,
  BlogBlockType,
  IntroBlockContent,
  ImageBlockContent,
  CodeBlockContent,
  FaqBlockContent,
  TableBlockContent,
  StatsBlockContent,
  CtaBlockContent,
  FaqItem,
  CODE_LANGUAGES,
} from '@/types/blogBlocks';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

interface BlogBlockFormProps {
  block: BlogBlock;
  onUpdate: (content: BlogBlock['content']) => void;
  onDelete: () => void;
  onUploadImage?: (file: File) => Promise<string>;
}

export function BlogBlockForm({ block, onUpdate, onDelete, onUploadImage }: BlogBlockFormProps) {
  const content = block.content as any;

  if (block.type === 'text') {
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Текст</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        <ReactQuill
          theme="snow"
          value={content.html || ''}
          onChange={(html) => onUpdate({ html })}
          modules={{ toolbar: [['bold', 'italic'], ['link'], [{ list: 'ordered' }, { list: 'bullet' }]] }}
          style={{ minHeight: 120 }}
        />
      </Box>
    );
  }

  if (block.type === 'intro') {
    const c = content as IntroBlockContent;
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Hero / Intro</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        <TextField fullWidth label="Заголовок" value={c.title || ''} onChange={(e) => onUpdate({ ...c, title: e.target.value })} sx={{ mb: 1 }} />
        <TextField fullWidth multiline label="Текст" value={c.text || ''} onChange={(e) => onUpdate({ ...c, text: e.target.value })} sx={{ mb: 1 }} />
        <TextField label="Текст кнопки" value={c.ctaText || ''} onChange={(e) => onUpdate({ ...c, ctaText: e.target.value })} sx={{ mr: 1 }} />
        <TextField label="URL кнопки" value={c.ctaUrl || ''} onChange={(e) => onUpdate({ ...c, ctaUrl: e.target.value })} />
      </Box>
    );
  }

  if (block.type === 'image') {
    const c = content as ImageBlockContent;
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Изображение</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        <TextField fullWidth label="URL (например /uploads/images/...)" value={c.src || ''} onChange={(e) => onUpdate({ ...c, src: e.target.value })} sx={{ mb: 1 }} />
        <TextField fullWidth label="Alt" value={c.alt || ''} onChange={(e) => onUpdate({ ...c, alt: e.target.value })} sx={{ mb: 1 }} />
        <TextField fullWidth label="Подпись" value={c.caption || ''} onChange={(e) => onUpdate({ ...c, caption: e.target.value })} />
        {c.src && (
          <Box sx={{ mt: 2 }}>
            <img src={resolveImageUrl(c.src, '')} alt={c.alt || ''} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
          </Box>
        )}
      </Box>
    );
  }

  if (block.type === 'code') {
    const c = content as CodeBlockContent;
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Код</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        <FormControl size="small" sx={{ minWidth: 140, mb: 1 }}>
          <InputLabel>Язык</InputLabel>
          <Select value={c.language || 'javascript'} label="Язык" onChange={(e) => onUpdate({ ...c, language: e.target.value })}>
            {CODE_LANGUAGES.map((l) => (
              <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          multiline
          minRows={8}
          value={c.code || ''}
          onChange={(e) => onUpdate({ ...c, code: e.target.value })}
          placeholder="Введи код для статьи..."
          sx={{
            '& textarea': { fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: '0.9rem' },
          }}
        />
      </Box>
    );
  }

  if (block.type === 'faq') {
    const c = content as FaqBlockContent;
    const items = c.items || [];
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">FAQ</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        {items.map((item, i) => (
          <Box key={i} sx={{ mb: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
            <TextField fullWidth label="Вопрос" value={item.question} onChange={(e) => {
              const next = [...items]; next[i] = { ...next[i], question: e.target.value }; onUpdate({ items: next });
            }} sx={{ mb: 1 }} />
            <TextField fullWidth multiline label="Ответ" value={item.answer} onChange={(e) => {
              const next = [...items]; next[i] = { ...next[i], answer: e.target.value }; onUpdate({ items: next });
            }} />
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={() => onUpdate({ items: [...items, { question: '', answer: '' }] })}>Добавить вопрос</Button>
      </Box>
    );
  }

  if (block.type === 'table') {
    const c = content as TableBlockContent;
    const headers = c.headers || [];
    const rows = c.rows || [];
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Таблица</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        <TextField fullWidth size="small" label="Заголовки (через запятую)" value={headers.join(', ')} onChange={(e) => onUpdate({ ...c, headers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} sx={{ mb: 1 }} />
        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Строки: одна строка — одна ячейка, разделитель — |</Typography>
        <TextField fullWidth multiline minRows={4} placeholder="Ячейка1 | Ячейка2 | Ячейка3&#10;Ячейка1 | Ячейка2 | Ячейка3" value={rows.map((r) => r.join(' | ')).join('\n')} onChange={(e) => onUpdate({ ...c, rows: e.target.value.split('\n').map((line) => line.split('|').map((s) => s.trim())) })} />
      </Box>
    );
  }

  if (block.type === 'stats') {
    const c = content as StatsBlockContent;
    const items = c.items || [];
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Статистика</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        {items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField size="small" label="Значение" value={item.value} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], value: e.target.value }; onUpdate({ items: next }); }} />
            <TextField size="small" label="Подпись" value={item.label} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], label: e.target.value }; onUpdate({ items: next }); }} />
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={() => onUpdate({ items: [...items, { value: '', label: '' }] })}>Добавить</Button>
      </Box>
    );
  }

  if (block.type === 'cta') {
    const c = content as CtaBlockContent;
    const buttons = c.buttons || [];
    return (
      <Box sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline">Призыв к действию</Typography>
          <IconButton size="small" onClick={onDelete} color="error"><DeleteIcon /></IconButton>
        </Box>
        <TextField fullWidth label="Заголовок" value={c.title || ''} onChange={(e) => onUpdate({ ...c, title: e.target.value })} sx={{ mb: 1 }} />
        <TextField fullWidth label="Текст" value={c.text || ''} onChange={(e) => onUpdate({ ...c, text: e.target.value })} sx={{ mb: 1 }} />
        {buttons.map((b, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField size="small" label="Текст кнопки" value={b.text} onChange={(e) => { const next = [...buttons]; next[i] = { ...next[i], text: e.target.value }; onUpdate({ ...c, buttons: next }); }} />
            <TextField size="small" label="URL" value={b.url} onChange={(e) => { const next = [...buttons]; next[i] = { ...next[i], url: e.target.value }; onUpdate({ ...c, buttons: next }); }} />
          </Box>
        ))}
        <Button startIcon={<AddIcon />} onClick={() => onUpdate({ ...c, buttons: [...buttons, { text: '', url: '' }] })}>Добавить кнопку</Button>
      </Box>
    );
  }

  return null;
}
