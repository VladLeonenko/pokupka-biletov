import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItem, ListItemText, Link } from '@mui/material';
import { getApiBase } from '@/utils/apiBase';

function PagesList() {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    const API_BASE = getApiBase();
    fetch(`${API_BASE}/api/pages`)
      .then(res => res.json())
      .then(data => setPages(data))
      .catch(console.error);
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h3" gutterBottom>
        Все страницы
      </Typography>
      <List>
        {pages.map(page => (
          <ListItem key={page.id}>
            <Link href={`/edit/${page.slug}`} underline="hover" variant="body1">
              {page.title}
            </Link>
          </ListItem>
        ))}
      </List>
    </Container>
  );
}

export default PagesList;
