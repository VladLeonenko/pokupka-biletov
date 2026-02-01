import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { PageSection, SectionLayout, PageBlock, BlockType } from '@/types/pageBuilder';
import { SectionBlockSelector } from './SectionBlockSelector';

interface SectionEditorProps {
  section: PageSection;
  onUpdate: (section: PageSection) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onAddBlock: (columnId: string, blockType: BlockType) => void;
  onUpdateBlock: (columnId: string, blockId: string, updates: Partial<PageBlock>) => void;
  onDeleteBlock: (columnId: string, blockId: string) => void;
  onMoveBlock: (columnId: string, blockId: string, direction: 'up' | 'down') => void;
}

const layoutLabels: Record<SectionLayout, string> = {
  'full-width': 'Одна колонка (100%)',
  'two-50-50': '2 колонки (50% / 50%)',
  'two-33-67': '2 колонки (33% / 67%)',
  'two-67-33': '2 колонки (67% / 33%)',
  'two-25-75': '2 колонки (25% / 75%)',
  'two-75-25': '2 колонки (75% / 25%)',
  'three-equal': '3 колонки (равные)',
  'four-equal': '4 колонки (равные)',
};

const getColumnWidths = (layout: SectionLayout): number[] => {
  switch (layout) {
    case 'full-width':
      return [12];
    case 'two-50-50':
      return [6, 6];
    case 'two-33-67':
      return [4, 8];
    case 'two-67-33':
      return [8, 4];
    case 'two-25-75':
      return [3, 9];
    case 'two-75-25':
      return [9, 3];
    case 'three-equal':
      return [4, 4, 4];
    case 'four-equal':
      return [3, 3, 3, 3];
    default:
      return [12];
  }
};

export function SectionEditor({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
}: SectionEditorProps) {
  const handleLayoutChange = (newLayout: SectionLayout) => {
    const newColumnCount = getColumnWidths(newLayout).length;
    const currentColumnCount = section.columns.length;

    let newColumns = [...section.columns];

    // Если нужно больше колонок - добавляем
    if (newColumnCount > currentColumnCount) {
      for (let i = currentColumnCount; i < newColumnCount; i++) {
        newColumns.push({
          id: `column-${Date.now()}-${i}`,
          blocks: [],
        });
      }
    }
    // Если нужно меньше колонок - удаляем лишние
    else if (newColumnCount < currentColumnCount) {
      newColumns = newColumns.slice(0, newColumnCount);
    }

    onUpdate({
      ...section,
      layout: newLayout,
      columns: newColumns,
    });
  };

  const columnWidths = getColumnWidths(section.layout);

  return (
    <Card sx={{ mb: 3, border: '2px solid #e0e0e0' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Секция: {layoutLabels[section.layout]}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onMoveUp && (
              <IconButton size="small" onClick={onMoveUp} disabled={!canMoveUp}>
                <ArrowUpwardIcon />
              </IconButton>
            )}
            {onMoveDown && (
              <IconButton size="small" onClick={onMoveDown} disabled={!canMoveDown}>
                <ArrowDownwardIcon />
              </IconButton>
            )}
            <IconButton size="small" color="error" onClick={onDelete}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Тип секции</InputLabel>
          <Select
            value={section.layout}
            label="Тип секции"
            onChange={(e) => handleLayoutChange(e.target.value as SectionLayout)}
          >
            {Object.entries(layoutLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          {section.columns.map((column, columnIndex) => (
            <Grid item xs={12} md={columnWidths[columnIndex]} key={column.id}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: '#f5f5f5',
                  border: '1px dashed #ccc',
                  minHeight: 100,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Колонка {columnIndex + 1} ({Math.round((columnWidths[columnIndex] / 12) * 100)}%)
                  </Typography>
                  <SectionBlockSelector
                    onSelect={(type) => onAddBlock(column.id, type)}
                    label="Добавить блок"
                  />
                </Box>

                {column.blocks.length === 0 ? (
                  <Box
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      border: '1px dashed #ddd',
                      borderRadius: 1,
                      bgcolor: '#fafafa',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Колонка пуста. Добавьте блоки.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {column.blocks.map((block, blockIndex) => (
                      <Card key={block.id} sx={{ mb: 1, bgcolor: '#fff' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {block.type} {block.name && `- ${block.name}`}
                            </Typography>
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => onMoveBlock(column.id, block.id, 'up')}
                                disabled={blockIndex === 0}
                              >
                                <ArrowUpwardIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => onMoveBlock(column.id, block.id, 'down')}
                                disabled={blockIndex === column.blocks.length - 1}
                              >
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => onDeleteBlock(column.id, block.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            ID: {block.id}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
