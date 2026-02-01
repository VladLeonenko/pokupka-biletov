import { Box, Typography, Button, TextField } from '@mui/material';
import { PageBlock, DeviceType } from '@/types/pageBuilder';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

interface BlockRendererProps {
  block: PageBlock;
  deviceType: DeviceType;
  isPreview: boolean;
  onUpdate: (updates: Partial<PageBlock>) => void;
  onDelete: () => void;
}

export function BlockRenderer({
  block,
  deviceType,
  isPreview,
  onUpdate,
  onDelete,
}: BlockRendererProps) {
  const styles = block.styles || {};
  const display = styles.display?.[deviceType] || 'block';

  if (display === 'none') {
    return null;
  }

  const blockStyle: React.CSSProperties = {
    width: styles.width || '100%',
    height: styles.height || 'auto',
    minHeight: styles.minHeight || 'auto',
    maxWidth: styles.maxWidth || '100%',
    backgroundColor: styles.backgroundColor || 'transparent',
    color: styles.color || '#000',
    padding: styles.padding
      ? `${styles.padding.top || 0}px ${styles.padding.right || 0}px ${styles.padding.bottom || 0}px ${styles.padding.left || 0}px`
      : undefined,
    margin: styles.margin
      ? `${styles.margin.top || 0}px ${styles.margin.right || 0}px ${styles.margin.bottom || 0}px ${styles.margin.left || 0}px`
      : undefined,
    borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined,
    borderWidth: styles.borderWidth ? `${styles.borderWidth}px` : undefined,
    borderStyle: styles.borderStyle || 'none',
    borderColor: styles.borderColor || 'transparent',
    boxShadow: styles.boxShadow || undefined,
    opacity: styles.opacity !== undefined ? styles.opacity : 1,
    zIndex: styles.zIndex || 'auto',
    backgroundImage: styles.backgroundImage || undefined,
    backgroundSize: styles.backgroundSize || 'cover',
    backgroundPosition: styles.backgroundPosition || 'center',
    backgroundRepeat: styles.backgroundRepeat || 'no-repeat',
    textAlign: styles.textAlign || 'left',
    fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
    fontFamily: styles.fontFamily || 'inherit',
    fontWeight: styles.fontWeight || 'normal',
    lineHeight: styles.lineHeight || 1.5,
    letterSpacing: styles.letterSpacing ? `${styles.letterSpacing}px` : undefined,
  };

  const renderContent = () => {
    switch (block.type) {
      case 'cover':
        return (
          <Box sx={{ position: 'relative', width: '100%', minHeight: 400 }}>
            {block.content.videoUrl && (
              <Box
                component="video"
                src={resolveImageUrl(block.content.videoUrl)}
                autoPlay
                loop
                muted
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            {block.content.imageUrl && !block.content.videoUrl && (
              <Box
                component="img"
                src={resolveImageUrl(block.content.imageUrl)}
                alt={block.content.title}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            <Box
              sx={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                textAlign: 'center',
                p: 4,
              }}
            >
              {block.content.title && (
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2rem', md: '4rem' },
                    fontWeight: 700,
                    mb: 2,
                    color: block.content.title ? '#fff' : (styles.color || '#000'),
                  }}
                >
                  {block.content.title}
                </Typography>
              )}
              {block.content.subtitle && (
                <Typography variant="h5" sx={{ mb: 3, color: '#fff' }}>
                  {block.content.subtitle}
                </Typography>
              )}
              {block.content.buttonText && (
                <Button variant="contained" size="large">
                  {block.content.buttonText}
                </Button>
              )}
            </Box>
          </Box>
        );

      case 'content':
        return (
          <Box sx={{ color: styles.color || '#000' }}>
            {block.content.imageUrl && (
              <Box
                component="img"
                src={resolveImageUrl(block.content.imageUrl)}
                alt={block.seo?.alt || block.name}
                sx={{
                  width: '100%',
                  maxHeight: 400,
                  objectFit: 'cover',
                  mb: 2,
                }}
              />
            )}
            {block.content.text && (
              <Typography
                dangerouslySetInnerHTML={{ __html: block.content.text }}
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: styles.color || '#000',
                }}
              />
            )}
            {block.content.html && (
              <Box 
                dangerouslySetInnerHTML={{ __html: block.content.html }}
                sx={{ color: styles.color || '#000', '& p': { color: styles.color || '#000' } }}
              />
            )}
            {/* FAQ */}
            {block.content.type === 'faq' && block.content.items && (
              <Box>
                {(block.content.items || []).map((item: any, index: number) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1, color: styles.color || '#000' }}>{item.question}</Typography>
                    <Typography sx={{ color: styles.color || '#000' }}>{item.answer}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {/* Pricing */}
            {block.content.type === 'pricing' && block.content.plans && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
                {(block.content.plans || []).map((plan: any, index: number) => (
                  <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h5" sx={{ color: styles.color || '#000' }}>{plan.name}</Typography>
                    <Typography variant="h4" sx={{ color: styles.color || '#000' }}>{plan.price}</Typography>
                    <Typography variant="body2" sx={{ color: styles.color || '#000' }}>{plan.period}</Typography>
                    <Typography sx={{ my: 2, color: styles.color || '#000' }}>{plan.description}</Typography>
                    <Button variant="contained">{plan.buttonText || 'Выбрать'}</Button>
                  </Box>
                ))}
              </Box>
            )}
            {/* Team */}
            {block.content.type === 'team' && block.content.items && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                {(block.content.items || []).map((member: any, index: number) => (
                  <Box key={index} sx={{ textAlign: 'center' }}>
                    {member.photo && (
                      <Box
                        component="img"
                        src={resolveImageUrl(member.photo)}
                        alt={member.name}
                        sx={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', mx: 'auto', mb: 1 }}
                      />
                    )}
                    <Typography variant="h6" sx={{ color: styles.color || '#000' }}>{member.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{member.role}</Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: styles.color || '#000' }}>{member.description}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {/* Steps */}
            {block.content.type === 'steps' && block.content.steps && (
              <Box>
                {(block.content.steps || []).map((step: any, index: number) => (
                  <Box key={index} sx={{ mb: 3, display: 'flex', gap: 2 }}>
                    <Box sx={{ minWidth: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step.number || index + 1}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ color: styles.color || '#000' }}>{step.title}</Typography>
                      <Typography sx={{ color: styles.color || '#000' }}>{step.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );

      case 'image':
        return (
          <Box
            component="img"
            src={resolveImageUrl(block.content.imageUrl || '')}
            alt={block.seo?.alt || block.name}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        );

      case 'text':
        return (
          <Typography
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: styles.color || '#000',
            }}
          >
            {block.content.text || 'Введите текст...'}
          </Typography>
        );

      case 'cta':
        return (
          <Box sx={{ textAlign: 'center', p: 4, color: styles.color || '#000' }}>
            {block.content.title && (
              <Typography variant="h3" sx={{ mb: 2, color: styles.color || '#000' }}>
                {block.content.title}
              </Typography>
            )}
            {block.content.text && (
              <Typography variant="body1" sx={{ mb: 3, color: styles.color || '#000' }}>
                {block.content.text}
              </Typography>
            )}
            {block.content.buttonText && (
              <Button
                variant="contained"
                size="large"
                href={block.content.linkUrl}
                sx={{
                  backgroundColor: styles.backgroundColor || '#1976d2',
                  color: styles.color || '#fff',
                  borderRadius: styles.borderRadius || 4,
                }}
              >
                {block.content.buttonText}
              </Button>
            )}
          </Box>
        );

      case 'features':
        return (
          <Box sx={{ p: 4 }}>
            <Typography variant="h2" sx={{ mb: 4, textAlign: 'center' }}>
              {block.content.title || 'Особенности'}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              {(block.content.items || []).map((item: any, index: number) => (
                <Box key={index} sx={{ textAlign: 'center' }}>
                  {item.icon && (
                    <Typography variant="h2" sx={{ mb: 2 }}>
                      {item.icon}
                    </Typography>
                  )}
                  {item.title && (
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {item.title}
                    </Typography>
                  )}
                  {item.description && (
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'gallery':
        const galleryItems = block.content.items || [];
        const isSlider = block.content.layout === 'slider';
        return (
          <Box sx={{ p: 2 }}>
            {isSlider ? (
              <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
                  {galleryItems.map((item: any, index: number) => (
                    <Box
                      key={index}
                      component="img"
                      src={resolveImageUrl(item.imageUrl)}
                      alt={item.alt || ''}
                      sx={{ minWidth: 300, height: 200, objectFit: 'cover', borderRadius: 1 }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {galleryItems.map((item: any, index: number) => (
                  <Box
                    key={index}
                    component="img"
                    src={resolveImageUrl(item.imageUrl || item)}
                    alt={item.alt || `Image ${index + 1}`}
                    sx={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        );

      case 'menu':
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', color: styles.color || '#000' }}>
            {(block.content.items || []).map((item: any, index: number) => (
              <Button
                key={index}
                href={item.link || item.url || item.linkUrl}
                sx={{ color: styles.color || 'inherit' }}
              >
                {item.text || item.label}
              </Button>
            ))}
          </Box>
        );

      case 'forms':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, color: styles.color || '#000' }}>
            {(block.content.fields || []).map((field: any, index: number) => (
              <TextField
                key={index}
                fullWidth
                label={field.name}
                placeholder={field.placeholder}
                type={field.type}
                required={field.required}
                sx={{ mb: 2 }}
              />
            ))}
            <Button variant="contained" fullWidth>
              {block.content.submitButtonText || 'Отправить'}
            </Button>
          </Box>
        );

      default:
        return (
          <Box sx={{ p: 2, textAlign: 'center', color: styles.color || '#000' }}>
            <Typography sx={{ color: styles.color || '#000' }}>Блок: {block.name}</Typography>
            <Typography variant="caption" sx={{ color: styles.color || '#000' }}>
              Тип: {block.type}
            </Typography>
            {block.content.html && (
              <Box 
                dangerouslySetInnerHTML={{ __html: block.content.html }}
                sx={{ color: styles.color || '#000', '& p': { color: styles.color || '#000' } }}
              />
            )}
            {block.content.text && (
              <Typography sx={{ color: styles.color || '#000' }}>{block.content.text}</Typography>
            )}
          </Box>
        );
    }
  };

  return (
    <Box style={blockStyle}>
      {renderContent()}
      {block.children && block.children.length > 0 && (
        <Box>
          {block.children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              deviceType={deviceType}
              isPreview={isPreview}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
