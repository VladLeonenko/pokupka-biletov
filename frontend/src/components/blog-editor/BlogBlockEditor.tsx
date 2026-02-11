import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Button, IconButton, Paper, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { BlogBlock, BlogBlockType, BLOG_BLOCK_LABELS } from '@/types/blogBlocks';
import { BlogBlockForm } from './BlogBlockForm';

const createEmptyBlock = (type: BlogBlockType): BlogBlock => {
  const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const base = { id, type };
  switch (type) {
    case 'text':
      return { ...base, content: { html: '' } };
    case 'intro':
      return { ...base, content: { title: '', text: '', ctaText: '', ctaUrl: '' } };
    case 'image':
      return { ...base, content: { src: '', alt: '', caption: '' } };
    case 'code':
      return { ...base, content: { code: '', language: 'javascript' } };
    case 'faq':
      return { ...base, content: { items: [] } };
    case 'table':
      return { ...base, content: { headers: [], rows: [] } };
    case 'stats':
      return { ...base, content: { items: [] } };
    case 'cta':
      return { ...base, content: { title: '', text: '', buttons: [] } };
    default:
      return { ...base, content: {} };
  }
};

function SortableBlockItem({
  block,
  onUpdate,
  onDelete,
}: {
  block: BlogBlock;
  onUpdate: (content: BlogBlock['content']) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ mb: 2 }}>
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.2)', px: 1, py: 0.5 }}>
          <Box {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex' }}>
            <DragIndicatorIcon fontSize="small" />
          </Box>
          <Typography variant="caption" sx={{ flex: 1, ml: 1 }}>{BLOG_BLOCK_LABELS[block.type]}</Typography>
        </Box>
        <BlogBlockForm block={block} onUpdate={onUpdate} onDelete={onDelete} />
      </Paper>
    </Box>
  );
}

interface BlogBlockEditorProps {
  blocks: BlogBlock[];
  onChange: (blocks: BlogBlock[]) => void;
}

export function BlogBlockEditor({ blocks, onChange }: BlogBlockEditorProps) {
  const [addBlockType, setAddBlockType] = useState<BlogBlockType>('text');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(blocks, oldIndex, newIndex));
    },
    [blocks, onChange],
  );

  const handleAddBlock = useCallback(() => {
    onChange([...blocks, createEmptyBlock(addBlockType)]);
  }, [blocks, onChange, addBlockType]);

  const handleUpdateBlock = useCallback(
    (id: string, content: BlogBlock['content']) => {
      onChange(
        blocks.map((b) => (b.id === id ? { ...b, content } : b)),
      );
    },
    [blocks, onChange],
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange],
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Добавить блок</InputLabel>
          <Select value={addBlockType} label="Добавить блок" onChange={(e) => setAddBlockType(e.target.value as BlogBlockType)}>
            {(Object.keys(BLOG_BLOCK_LABELS) as BlogBlockType[]).map((t) => (
              <MenuItem key={t} value={t}>{BLOG_BLOCK_LABELS[t]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddBlock}>
          Добавить
        </Button>
      </Box>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block) => (
            <SortableBlockItem
              key={block.id}
              block={block}
              onUpdate={(content) => handleUpdateBlock(block.id, content)}
              onDelete={() => handleDeleteBlock(block.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {blocks.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.2)' }}>
          <Typography color="text.secondary">Блоков пока нет. Добавьте первый блок выше.</Typography>
        </Paper>
      )}
    </Box>
  );
}
