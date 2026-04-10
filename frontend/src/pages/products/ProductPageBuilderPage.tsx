import { PageBuilderWrapper } from '@/components/page-builder/PageBuilderWrapper';
import { useToast } from '@/components/common/ToastProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { getProduct, upsertProduct } from '@/services/cmsApi';
import { PageBlock, PageSection } from '@/types/pageBuilder';

export function ProductPageBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: product, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => getProduct(id!),
    enabled: !isNew && !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { blocks?: PageBlock[]; sections?: PageSection[]; settings?: any }) => {
      if (!product && !isNew) {
        throw new Error('Product not found');
      }

      // Важно: сначала базовый contentJson, иначе старые blocks/sections из кэша затирают правки из конструктора (пропадают картинки и блоки).
      const contentJson = {
        ...(product?.contentJson || {}),
        blocks: data.blocks || [],
        sections: data.sections || [],
      };

      const updatedProduct = {
        ...product,
        slug: product?.slug || id || '',
        title: data.settings?.title || product?.title || '',
        descriptionHtml: product?.descriptionHtml || '',
        contentJson,
      };

      await upsertProduct(updatedProduct as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product'] });
      if (isNew && product?.slug) {
        navigate(`/admin/products/${product.slug}/builder`, { replace: true });
      }
      showToast('Продукт сохранен', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка сохранения', 'error');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  if (!product && !isNew) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Продукт не найден</Typography>
      </Box>
    );
  }

  const contentJson = product?.contentJson || {};
  const initialBlocks = contentJson.blocks || [];
  const initialSections = contentJson.sections || [];

  return (
    <PageBuilderWrapper
      initialBlocks={initialBlocks}
      initialSections={initialSections}
      initialSettings={{
        id: product?.slug || id || '',
        title: product?.title || '',
        slug: product?.slug || id || '',
        description: product?.summary || '',
        keywords: '',
      }}
      pageId={product?.slug || id}
      pageSlug={product?.slug || id}
      onSave={async (data) => {
        await saveMutation.mutateAsync(data);
      }}
    />
  );
}
