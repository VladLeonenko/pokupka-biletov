import { Box, Grid, Paper, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { BlockLibraryItem, PageBlock } from '@/types/pageBuilder';

interface BlockCategoryProps {
  category: string;
  templates: BlockLibraryItem[];
  onAddBlock: (block: Partial<PageBlock>) => void;
}

export function BlockCategory({ templates, onAddBlock }: BlockCategoryProps) {
  if (templates.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">Блоки не найдены</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {templates.map((template, index) => (
        <Grid item xs={6} sm={4} key={`${template.id}-${index}-${template.name}`}>
          <Paper
            sx={{
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
            onClick={() => onAddBlock(template.block)}
          >
            <Box
              sx={{
                aspectRatio: '16/9',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {template.thumbnail ? (
                <Box
                  component="img"
                  src={template.thumbnail}
                  alt={template.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Typography variant="h4">{template.icon}</Typography>
              )}
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBlock(template.block);
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" fontWeight={600}>
                {template.name}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
