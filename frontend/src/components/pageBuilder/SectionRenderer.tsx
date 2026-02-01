import { Box, Grid, Container } from '@mui/material';
import { PageSection, SectionLayout } from '@/types/pageBuilder';
import { BlockRenderer } from './BlockRenderer';

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

interface SectionRendererProps {
  section: PageSection;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const columnWidths = getColumnWidths(section.layout);
  const sectionStyle: React.CSSProperties = {
    backgroundColor: section.settings?.backgroundColor,
    padding: section.settings?.padding,
    margin: section.settings?.margin,
  };

  return (
    <Box
      component="section"
      sx={sectionStyle}
      className={section.settings?.className}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {section.columns.map((column, columnIndex) => (
            <Grid item xs={12} md={columnWidths[columnIndex]} key={column.id}>
              {column.blocks.map((block) => (
                <Box key={block.id} sx={{ mb: 2 }}>
                  <BlockRenderer block={block} />
                </Box>
              ))}
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
