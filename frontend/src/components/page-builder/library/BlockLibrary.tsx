import { useState } from 'react';
import { Box, Typography, TextField, Tabs, Tab, Paper, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { BlockLibraryItem, PageBlock } from '@/types/pageBuilder';
import { BlockCategory } from './BlockCategory';
import { blockTemplates } from './blockTemplates';

interface BlockLibraryProps {
  onAddBlock: (block: Partial<PageBlock>) => void;
}

export function BlockLibrary({ onAddBlock }: BlockLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('cover');

  const categories = [
    { id: 'cover', name: 'Cover (Hero)', icon: '📱' },
    { id: 'menu', name: 'Menu', icon: '🍔' },
    { id: 'content', name: 'Content', icon: '✍️' },
    { id: 'gallery', name: 'Gallery', icon: '🖼️' },
    { id: 'shop', name: 'Shop', icon: '🛒' },
    { id: 'forms', name: 'Forms', icon: '📝' },
    { id: 'social', name: 'Social', icon: '⭐' },
    { id: 'features', name: 'Features', icon: '⚡' },
    { id: 'cta', name: 'CTA', icon: '🎯' },
  ];

  const filteredTemplates = blockTemplates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск блоков..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Box>

      {/* Categories */}
      <Tabs
        value={activeCategory}
        onChange={(_, value) => setActiveCategory(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {categories.map((category) => (
          <Tab
            key={category.id}
            value={category.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{category.icon}</span>
                <Typography variant="caption" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {category.name}
                </Typography>
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Blocks Grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <BlockCategory
          category={activeCategory}
          templates={filteredTemplates}
          onAddBlock={onAddBlock}
        />
      </Box>
    </Box>
  );
}
