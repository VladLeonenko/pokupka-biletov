import { Box, Card, CardContent, Tab, Tabs, Typography, Table, TableBody, TableCell, TableHead, TableRow, Link } from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMaterials, getProductMatrix, getCases } from '@/services/salesAcademyApi';
import PhoneIcon from '@mui/icons-material/Phone';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WorkIcon from '@mui/icons-material/Work';
import InventoryIcon from '@mui/icons-material/Inventory';

function ScriptsTab() {
  const { data } = useQuery({ queryKey: ['training', 'call_script'], queryFn: () => getMaterials('call_script') });
  const { data: guides } = useQuery({ queryKey: ['training', 'admin_guide'], queryFn: () => getMaterials('admin_guide') });
  const items = [...(guides || []), ...(data || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Box sx={{ pt: 2 }}>
      {items.map((m) => (
        <Card key={m.id} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{m.title}</Typography>
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', mt: 1 }}>
              {m.content || ''}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function ObjectionsTab() {
  const { data } = useQuery({ queryKey: ['training', 'objection'], queryFn: () => getMaterials('objection') });

  return (
    <Box sx={{ pt: 2 }}>
      {data?.map((m) => (
        <Card key={m.id} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary">{m.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {m.objection_text}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {m.solution_text}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function CasesTab() {
  const { data } = useQuery({ queryKey: ['sales-cases'], queryFn: getCases });

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Кейсы из базы — обновляются автоматически
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Кейс</TableCell>
            <TableCell>Категория</TableCell>
            <TableCell>Ссылка</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.map((c) => (
            <TableRow key={c.slug}>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.category || '—'}</TableCell>
              <TableCell>
                <Link href={`/cases/${c.slug}`} target="_blank" rel="noopener">
                  Открыть
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ProductMatrixTab() {
  const { data } = useQuery({ queryKey: ['product-matrix'], queryFn: getProductMatrix });

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Продуктовая матрица из каталога
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Продукт</TableCell>
            <TableCell>Цена</TableCell>
            <TableCell>Описание</TableCell>
            <TableCell>Ссылка</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.products?.map((p) => (
            <TableRow key={p.slug}>
              <TableCell>{p.title}</TableCell>
              <TableCell>{p.price}{p.period}</TableCell>
              <TableCell sx={{ maxWidth: 300 }}>{p.summary || '—'}</TableCell>
              <TableCell>
                <Link href={`/products/${p.slug}`} target="_blank" rel="noopener">
                  Каталог
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function SalesAcademyPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Академия продаж</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Скрипты звонков, возражения и решения, кейсы, продуктовая матрица — всё под рукой
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab icon={<PhoneIcon />} iconPosition="start" label="Скрипты звонков" />
        <Tab icon={<PsychologyIcon />} iconPosition="start" label="Возражения" />
        <Tab icon={<WorkIcon />} iconPosition="start" label="Кейсы" />
        <Tab icon={<InventoryIcon />} iconPosition="start" label="Продуктовая матрица" />
      </Tabs>

      {tab === 0 && <ScriptsTab />}
      {tab === 1 && <ObjectionsTab />}
      {tab === 2 && <CasesTab />}
      {tab === 3 && <ProductMatrixTab />}
    </Box>
  );
}
