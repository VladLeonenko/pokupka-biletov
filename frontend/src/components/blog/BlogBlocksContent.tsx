import { Box } from '@mui/material';
import { BlogBlock } from '@/types/blogBlocks';
import { BlogBlockRenderer } from './BlogBlockRenderer';
import { BlogPostStyles } from './BlogPostStyles';

interface BlogBlocksContentProps {
  blocks: BlogBlock[];
}

export function BlogBlocksContent({ blocks }: BlogBlocksContentProps) {
  return (
    <>
      <BlogPostStyles />
      <Box className="blog-post-content">
        {blocks.map((block) => (
          <BlogBlockRenderer key={block.id} block={block} />
        ))}
      </Box>
    </>
  );
}
