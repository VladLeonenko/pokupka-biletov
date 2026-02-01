import { useState } from 'react';
import { Box, Tabs, Tab, TextField, Typography, Slider, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Button, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { uploadImage } from '@/services/cmsApi';
// TODO: Адаптировать uploadImage под текущий проект
import { useToast } from '@/components/common/ToastProvider';
import { PageBlock, DeviceType } from '@/types/pageBuilder';

interface SettingsPanelProps {
  block: PageBlock;
  deviceType: DeviceType;
  onUpdate: (updates: Partial<PageBlock>) => void;
}

export function SettingsPanel({ block, deviceType, onUpdate }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState(0);

  const updateStyles = (styleUpdates: Partial<typeof block.styles>) => {
    onUpdate({
      styles: {
        ...block.styles,
        ...styleUpdates,
      },
    });
  };

  const updateContent = (contentUpdates: Partial<typeof block.content>) => {
    onUpdate({
      content: {
        ...block.content,
        ...contentUpdates,
      },
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
        <Tab label="Content" />
        <Tab label="Style" />
        <Tab label="Typo" />
        <Tab label="Spacing" />
        <Tab label="Animation" />
        <Tab label="Visibility" />
        <Tab label="Advanced" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <ContentTab block={block} onUpdate={updateContent} />
        )}
        {activeTab === 1 && (
          <StyleTab block={block} onUpdate={updateStyles} />
        )}
        {activeTab === 2 && (
          <TypoTab block={block} onUpdate={updateStyles} />
        )}
        {activeTab === 3 && (
          <SpacingTab block={block} deviceType={deviceType} onUpdate={updateStyles} />
        )}
        {activeTab === 4 && (
          <AnimationTab block={block} onUpdate={updateStyles} />
        )}
        {activeTab === 5 && (
          <VisibilityTab block={block} deviceType={deviceType} onUpdate={updateStyles} />
        )}
        {activeTab === 6 && (
          <AdvancedTab block={block} onUpdate={onUpdate} />
        )}
      </Box>
    </Box>
  );
}

function ContentTab({ block, onUpdate }: { block: PageBlock; onUpdate: (updates: any) => void }) {
  const { showToast } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (field: 'imageUrl' | 'videoUrl' | 'items', index?: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      try {
        setUploadingImage(true);
        const response = await uploadImage(file);
        const imageUrl = response.url;
        
        if (field === 'items' && index !== undefined) {
          const newItems = [...(block.content.items || [])];
          newItems[index] = { ...newItems[index], imageUrl };
          onUpdate({ items: newItems });
        } else {
          onUpdate({ [field]: imageUrl });
        }
        showToast('Изображение загружено', 'success');
      } catch (error: any) {
        showToast(error?.message || 'Ошибка загрузки', 'error');
      } finally {
        setUploadingImage(false);
        target.value = '';
      }
    };
    input.click();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Содержимое блока</Typography>
      
      {/* Текст для всех типов блоков */}
      {(block.type === 'text' || block.type === 'content' || block.type === 'cover' || block.type === 'cta') && (
        <>
          <TextField
            label="Текст"
            multiline
            rows={4}
            fullWidth
            value={block.content.text || ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
          />
          <TextField
            label="HTML"
            multiline
            rows={6}
            fullWidth
            value={block.content.html || ''}
            onChange={(e) => onUpdate({ html: e.target.value })}
          />
        </>
      )}

      {/* Заголовок для cover блоков */}
      {block.type === 'cover' && (
        <>
          <TextField
            label="Заголовок"
            fullWidth
            value={block.content.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={block.content.subtitle || ''}
            onChange={(e) => onUpdate({ subtitle: e.target.value })}
          />
          <TextField
            label="Текст кнопки"
            fullWidth
            value={block.content.buttonText || ''}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
          />
        </>
      )}

      {/* Изображение */}
      {(block.type === 'image' || block.type === 'cover' || block.type === 'content' || block.type === 'gallery') && (
        <>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="URL изображения"
              fullWidth
              value={block.content.imageUrl || ''}
              onChange={(e) => onUpdate({ imageUrl: e.target.value })}
            />
            <Button
              variant="outlined"
              onClick={() => handleImageUpload('imageUrl')}
              disabled={uploadingImage}
              sx={{ minWidth: 120 }}
            >
              {uploadingImage ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </Box>
          {block.type === 'gallery' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>Элементы галереи</Typography>
              {(block.content.items || []).map((item: any, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label={`Изображение ${index + 1}`}
                      fullWidth
                      size="small"
                      value={item.imageUrl || ''}
                      onChange={(e) => {
                        const newItems = [...(block.content.items || [])];
                        newItems[index] = { ...newItems[index], imageUrl: e.target.value };
                        onUpdate({ items: newItems });
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleImageUpload('items', index)}
                      disabled={uploadingImage}
                    >
                      Загрузить
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newItems = (block.content.items || []).filter((_: any, i: number) => i !== index);
                        onUpdate({ items: newItems });
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <TextField
                    label="Alt текст"
                    fullWidth
                    size="small"
                    value={item.alt || ''}
                    onChange={(e) => {
                      const newItems = [...(block.content.items || [])];
                      newItems[index] = { ...newItems[index], alt: e.target.value };
                      onUpdate({ items: newItems });
                    }}
                  />
                </Box>
              ))}
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  const newItems = [...(block.content.items || []), { imageUrl: '', alt: '' }];
                  onUpdate({ items: newItems });
                }}
              >
                Добавить изображение
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Видео */}
      {(block.type === 'cover' || block.type === 'content' || block.content.videoUrl !== undefined) && (
        <TextField
          label="URL видео"
          fullWidth
          value={block.content.videoUrl || ''}
          onChange={(e) => onUpdate({ videoUrl: e.target.value })}
        />
      )}

      {/* Ссылка */}
      {(block.type === 'cta' || block.type === 'content' || block.content.linkUrl !== undefined) && (
        <TextField
          label="Ссылка"
          fullWidth
          value={block.content.linkUrl || ''}
          onChange={(e) => onUpdate({ linkUrl: e.target.value })}
        />
      )}

      {/* Слайдер */}
      {(block.type === 'gallery' && block.content.layout === 'slider') && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Настройки слайдера</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={block.content.autoplay || false}
                onChange={(e) => onUpdate({ autoplay: e.target.checked })}
              />
            }
            label="Автоплей"
          />
          <TextField
            label="Скорость (мс)"
            type="number"
            fullWidth
            value={block.content.speed || 3000}
            onChange={(e) => onUpdate({ speed: parseInt(e.target.value) || 3000 })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={block.content.showNavigation || true}
                onChange={(e) => onUpdate({ showNavigation: e.target.checked })}
              />
            }
            label="Показывать навигацию"
          />
        </>
      )}

      {/* Формы */}
      {block.type === 'forms' && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Поля формы</Typography>
          {(block.content.fields || []).map((field: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Название поля"
                  size="small"
                  fullWidth
                  value={field.name || ''}
                  onChange={(e) => {
                    const newFields = [...(block.content.fields || [])];
                    newFields[index] = { ...newFields[index], name: e.target.value };
                    onUpdate({ fields: newFields });
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Тип</InputLabel>
                  <Select
                    value={field.type || 'text'}
                    onChange={(e) => {
                      const newFields = [...(block.content.fields || [])];
                      newFields[index] = { ...newFields[index], type: e.target.value };
                      onUpdate({ fields: newFields });
                    }}
                  >
                    <MenuItem value="text">Текст</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="tel">Телефон</MenuItem>
                    <MenuItem value="textarea">Текстовая область</MenuItem>
                    <MenuItem value="select">Выбор</MenuItem>
                    <MenuItem value="checkbox">Чекбокс</MenuItem>
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newFields = (block.content.fields || []).filter((_: any, i: number) => i !== index);
                    onUpdate({ fields: newFields });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Плейсхолдер"
                size="small"
                fullWidth
                value={field.placeholder || ''}
                onChange={(e) => {
                  const newFields = [...(block.content.fields || [])];
                  newFields[index] = { ...newFields[index], placeholder: e.target.value };
                  onUpdate({ fields: newFields });
                }}
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={field.required || false}
                    onChange={(e) => {
                      const newFields = [...(block.content.fields || [])];
                      newFields[index] = { ...newFields[index], required: e.target.checked };
                      onUpdate({ fields: newFields });
                    }}
                  />
                }
                label="Обязательное"
              />
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newFields = [...(block.content.fields || []), { name: '', type: 'text', placeholder: '', required: false }];
              onUpdate({ fields: newFields });
            }}
          >
            Добавить поле
          </Button>
          <Divider sx={{ my: 2 }} />
          <TextField
            label="Текст кнопки отправки"
            fullWidth
            value={block.content.submitButtonText || 'Отправить'}
            onChange={(e) => onUpdate({ submitButtonText: e.target.value })}
          />
          <TextField
            label="Email для уведомлений"
            fullWidth
            value={block.content.notificationEmail || ''}
            onChange={(e) => onUpdate({ notificationEmail: e.target.value })}
          />
        </>
      )}

      {/* FAQ */}
      {block.type === 'content' && block.content.type === 'faq' && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Вопросы и ответы</Typography>
          {(block.content.items || []).map((item: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>Вопрос {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newItems = (block.content.items || []).filter((_: any, i: number) => i !== index);
                    onUpdate({ items: newItems });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Вопрос"
                fullWidth
                size="small"
                value={item.question || ''}
                onChange={(e) => {
                  const newItems = [...(block.content.items || [])];
                  newItems[index] = { ...newItems[index], question: e.target.value };
                  onUpdate({ items: newItems });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Ответ"
                multiline
                rows={3}
                fullWidth
                size="small"
                value={item.answer || ''}
                onChange={(e) => {
                  const newItems = [...(block.content.items || [])];
                  newItems[index] = { ...newItems[index], answer: e.target.value };
                  onUpdate({ items: newItems });
                }}
              />
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newItems = [...(block.content.items || []), { question: '', answer: '' }];
              onUpdate({ items: newItems });
            }}
          >
            Добавить вопрос
          </Button>
        </>
      )}

      {/* Pricing */}
      {block.type === 'content' && block.content.type === 'pricing' && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Тарифные планы</Typography>
          {(block.content.plans || []).map((plan: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>План {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newPlans = (block.content.plans || []).filter((_: any, i: number) => i !== index);
                    onUpdate({ plans: newPlans });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Название"
                fullWidth
                size="small"
                value={plan.name || ''}
                onChange={(e) => {
                  const newPlans = [...(block.content.plans || [])];
                  newPlans[index] = { ...newPlans[index], name: e.target.value };
                  onUpdate({ plans: newPlans });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Цена"
                fullWidth
                size="small"
                value={plan.price || ''}
                onChange={(e) => {
                  const newPlans = [...(block.content.plans || [])];
                  newPlans[index] = { ...newPlans[index], price: e.target.value };
                  onUpdate({ plans: newPlans });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Период"
                fullWidth
                size="small"
                value={plan.period || ''}
                onChange={(e) => {
                  const newPlans = [...(block.content.plans || [])];
                  newPlans[index] = { ...newPlans[index], period: e.target.value };
                  onUpdate({ plans: newPlans });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Описание"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={plan.description || ''}
                onChange={(e) => {
                  const newPlans = [...(block.content.plans || [])];
                  newPlans[index] = { ...newPlans[index], description: e.target.value };
                  onUpdate({ plans: newPlans });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Текст кнопки"
                fullWidth
                size="small"
                value={plan.buttonText || 'Выбрать'}
                onChange={(e) => {
                  const newPlans = [...(block.content.plans || [])];
                  newPlans[index] = { ...newPlans[index], buttonText: e.target.value };
                  onUpdate({ plans: newPlans });
                }}
              />
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newPlans = [...(block.content.plans || []), { name: '', price: '', period: '', description: '', buttonText: 'Выбрать' }];
              onUpdate({ plans: newPlans });
            }}
          >
            Добавить план
          </Button>
        </>
      )}

      {/* Team */}
      {block.type === 'content' && block.content.type === 'team' && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Участники команды</Typography>
          {(block.content.items || []).map((member: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>Участник {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newItems = (block.content.items || []).filter((_: any, i: number) => i !== index);
                    onUpdate({ items: newItems });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Имя"
                  fullWidth
                  size="small"
                  value={member.name || ''}
                  onChange={(e) => {
                    const newItems = [...(block.content.items || [])];
                    newItems[index] = { ...newItems[index], name: e.target.value };
                    onUpdate({ items: newItems });
                  }}
                />
                <TextField
                  label="Должность"
                  fullWidth
                  size="small"
                  value={member.role || ''}
                  onChange={(e) => {
                    const newItems = [...(block.content.items || [])];
                    newItems[index] = { ...newItems[index], role: e.target.value };
                    onUpdate({ items: newItems });
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Фото (URL)"
                  fullWidth
                  size="small"
                  value={member.photo || ''}
                  onChange={(e) => {
                    const newItems = [...(block.content.items || [])];
                    newItems[index] = { ...newItems[index], photo: e.target.value };
                    onUpdate({ items: newItems });
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleImageUpload('items', index)}
                  disabled={uploadingImage}
                >
                  Загрузить
                </Button>
              </Box>
              <TextField
                label="Описание"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={member.description || ''}
                onChange={(e) => {
                  const newItems = [...(block.content.items || [])];
                  newItems[index] = { ...newItems[index], description: e.target.value };
                  onUpdate({ items: newItems });
                }}
              />
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newItems = [...(block.content.items || []), { name: '', role: '', photo: '', description: '' }];
              onUpdate({ items: newItems });
            }}
          >
            Добавить участника
          </Button>
        </>
      )}

      {/* Steps */}
      {block.type === 'content' && block.content.type === 'steps' && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Шаги</Typography>
          {(block.content.steps || []).map((step: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>Шаг {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newSteps = (block.content.steps || []).filter((_: any, i: number) => i !== index);
                    onUpdate({ steps: newSteps });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Номер шага"
                type="number"
                fullWidth
                size="small"
                value={step.number || index + 1}
                onChange={(e) => {
                  const newSteps = [...(block.content.steps || [])];
                  newSteps[index] = { ...newSteps[index], number: parseInt(e.target.value) || index + 1 };
                  onUpdate({ steps: newSteps });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Заголовок"
                fullWidth
                size="small"
                value={step.title || ''}
                onChange={(e) => {
                  const newSteps = [...(block.content.steps || [])];
                  newSteps[index] = { ...newSteps[index], title: e.target.value };
                  onUpdate({ steps: newSteps });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Описание"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={step.description || ''}
                onChange={(e) => {
                  const newSteps = [...(block.content.steps || [])];
                  newSteps[index] = { ...newSteps[index], description: e.target.value };
                  onUpdate({ steps: newSteps });
                }}
              />
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newSteps = [...(block.content.steps || []), { number: (block.content.steps || []).length + 1, title: '', description: '' }];
              onUpdate({ steps: newSteps });
            }}
          >
            Добавить шаг
          </Button>
        </>
      )}

      {/* Элементы для features, menu и других списковых блоков */}
      {(block.type === 'features' || block.type === 'menu' || block.type === 'social') && (
        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">Элементы</Typography>
          {(block.content.items || []).map((item: any, index: number) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>Элемент {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newItems = (block.content.items || []).filter((_: any, i: number) => i !== index);
                    onUpdate({ items: newItems });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Текст"
                fullWidth
                size="small"
                value={item.text || item.label || ''}
                onChange={(e) => {
                  const newItems = [...(block.content.items || [])];
                  newItems[index] = { ...newItems[index], text: e.target.value, label: e.target.value };
                  onUpdate({ items: newItems });
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                label="Ссылка"
                fullWidth
                size="small"
                value={item.link || item.url || item.linkUrl || ''}
                onChange={(e) => {
                  const newItems = [...(block.content.items || [])];
                  newItems[index] = { ...newItems[index], link: e.target.value, url: e.target.value, linkUrl: e.target.value };
                  onUpdate({ items: newItems });
                }}
              />
              {block.type === 'features' && (
                <>
                  <TextField
                    label="Иконка (emoji или URL)"
                    fullWidth
                    size="small"
                    value={item.icon || ''}
                    onChange={(e) => {
                      const newItems = [...(block.content.items || [])];
                      newItems[index] = { ...newItems[index], icon: e.target.value };
                      onUpdate({ items: newItems });
                    }}
                    sx={{ mt: 1 }}
                  />
                  <TextField
                    label="Описание"
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    value={item.description || ''}
                    onChange={(e) => {
                      const newItems = [...(block.content.items || [])];
                      newItems[index] = { ...newItems[index], description: e.target.value };
                      onUpdate({ items: newItems });
                    }}
                    sx={{ mt: 1 }}
                  />
                </>
              )}
            </Box>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              const newItems = [...(block.content.items || []), { text: '', link: '' }];
              onUpdate({ items: newItems });
            }}
          >
            Добавить элемент
          </Button>
        </Box>
      )}

      {/* Универсальные поля для всех блоков */}
      <Divider sx={{ my: 2 }} />
      <TextField
        label="HTML контент (для всех типов)"
        multiline
        rows={6}
        fullWidth
        value={block.content.html || ''}
        onChange={(e) => onUpdate({ html: e.target.value })}
        helperText="Можно использовать HTML для любого блока"
      />
    </Box>
  );
}

function StyleTab({ block, onUpdate }: { block: PageBlock; onUpdate: (updates: any) => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Стили</Typography>
      
      <TextField
        label="Фоновый цвет"
        type="color"
        fullWidth
        value={block.styles?.backgroundColor || '#ffffff'}
        onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
      />

      <TextField
        label="Цвет текста"
        type="color"
        fullWidth
        value={block.styles?.color || '#000000'}
        onChange={(e) => onUpdate({ color: e.target.value })}
      />

      <TextField
        label="Фоновое изображение (URL)"
        fullWidth
        value={block.styles?.backgroundImage || ''}
        onChange={(e) => onUpdate({ backgroundImage: e.target.value })}
      />

      <FormControl fullWidth>
        <InputLabel>Размер фона</InputLabel>
        <Select
          value={block.styles?.backgroundSize || 'cover'}
          onChange={(e) => onUpdate({ backgroundSize: e.target.value })}
        >
          <MenuItem value="cover">Cover</MenuItem>
          <MenuItem value="contain">Contain</MenuItem>
          <MenuItem value="auto">Auto</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography gutterBottom>Радиус границы</Typography>
        <Slider
          value={block.styles?.borderRadius || 0}
          onChange={(_, value) => onUpdate({ borderRadius: value as number })}
          min={0}
          max={50}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Тень</Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="0 2px 4px rgba(0,0,0,0.1)"
          value={block.styles?.boxShadow || ''}
          onChange={(e) => onUpdate({ boxShadow: e.target.value })}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Прозрачность</Typography>
        <Slider
          value={(block.styles?.opacity ?? 1) * 100}
          onChange={(_, value) => onUpdate({ opacity: (value as number) / 100 })}
          min={0}
          max={100}
        />
      </Box>
    </Box>
  );
}

function TypoTab({ block, onUpdate }: { block: PageBlock; onUpdate: (updates: any) => void }) {
  const fonts = [
    'Geologica',
    'Helvetica',
    'Arial',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Playfair Display',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Типографика</Typography>
      
      <FormControl fullWidth>
        <InputLabel>Шрифт</InputLabel>
        <Select
          value={block.styles?.fontFamily || 'Geologica'}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
        >
          {fonts.map((font) => (
            <MenuItem key={font} value={font}>
              {font}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box>
        <Typography gutterBottom>Размер шрифта: {block.styles?.fontSize || 16}px</Typography>
        <Slider
          value={block.styles?.fontSize || 16}
          onChange={(_, value) => onUpdate({ fontSize: value as number })}
          min={8}
          max={72}
        />
      </Box>

      <FormControl fullWidth>
        <InputLabel>Насыщенность</InputLabel>
        <Select
          value={block.styles?.fontWeight || 'normal'}
          onChange={(e) => onUpdate({ fontWeight: e.target.value })}
        >
          <MenuItem value="100">Thin (100)</MenuItem>
          <MenuItem value="300">Light (300)</MenuItem>
          <MenuItem value="400">Normal (400)</MenuItem>
          <MenuItem value="500">Medium (500)</MenuItem>
          <MenuItem value="700">Bold (700)</MenuItem>
          <MenuItem value="900">Black (900)</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography gutterBottom>Межстрочный интервал: {block.styles?.lineHeight || 1.5}</Typography>
        <Slider
          value={(block.styles?.lineHeight || 1.5) * 100}
          onChange={(_, value) => onUpdate({ lineHeight: (value as number) / 100 })}
          min={100}
          max={300}
          step={10}
        />
      </Box>

      <FormControl fullWidth>
        <InputLabel>Выравнивание</InputLabel>
        <Select
          value={block.styles?.textAlign || 'left'}
          onChange={(e) => onUpdate({ textAlign: e.target.value })}
        >
          <MenuItem value="left">Слева</MenuItem>
          <MenuItem value="center">По центру</MenuItem>
          <MenuItem value="right">Справа</MenuItem>
          <MenuItem value="justify">По ширине</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

function SpacingTab({ block, deviceType, onUpdate }: { block: PageBlock; deviceType: DeviceType; onUpdate: (updates: any) => void }) {
  const padding = block.styles?.padding || {};
  const margin = block.styles?.margin || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Отступы (Padding)</Typography>
      
      <Box>
        <Typography gutterBottom>Верх: {padding.top || 0}px</Typography>
        <Slider
          value={padding.top || 0}
          onChange={(_, value) => onUpdate({
            padding: { ...padding, top: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Право: {padding.right || 0}px</Typography>
        <Slider
          value={padding.right || 0}
          onChange={(_, value) => onUpdate({
            padding: { ...padding, right: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Низ: {padding.bottom || 0}px</Typography>
        <Slider
          value={padding.bottom || 0}
          onChange={(_, value) => onUpdate({
            padding: { ...padding, bottom: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Лево: {padding.left || 0}px</Typography>
        <Slider
          value={padding.left || 0}
          onChange={(_, value) => onUpdate({
            padding: { ...padding, left: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Внешние отступы (Margin)</Typography>
      
      <Box>
        <Typography gutterBottom>Верх: {margin.top || 0}px</Typography>
        <Slider
          value={margin.top || 0}
          onChange={(_, value) => onUpdate({
            margin: { ...margin, top: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Право: {margin.right || 0}px</Typography>
        <Slider
          value={margin.right || 0}
          onChange={(_, value) => onUpdate({
            margin: { ...margin, right: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Низ: {margin.bottom || 0}px</Typography>
        <Slider
          value={margin.bottom || 0}
          onChange={(_, value) => onUpdate({
            margin: { ...margin, bottom: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Лево: {margin.left || 0}px</Typography>
        <Slider
          value={margin.left || 0}
          onChange={(_, value) => onUpdate({
            margin: { ...margin, left: value as number },
          })}
          min={0}
          max={200}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Ширина</Typography>
        <TextField
          fullWidth
          size="small"
          value={block.styles?.width || '100%'}
          onChange={(e) => onUpdate({ width: e.target.value })}
          placeholder="100% или 1200px"
        />
      </Box>

      <Box>
        <Typography gutterBottom>Высота</Typography>
        <TextField
          fullWidth
          size="small"
          value={block.styles?.height || 'auto'}
          onChange={(e) => onUpdate({ height: e.target.value })}
          placeholder="auto или 400px"
        />
      </Box>
    </Box>
  );
}

function AnimationTab({ block, onUpdate }: { block: PageBlock; onUpdate: (updates: any) => void }) {
  const animation = block.styles?.animation || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Анимация</Typography>
      
      <FormControl fullWidth>
        <InputLabel>Триггер</InputLabel>
        <Select
          value={animation.trigger || 'inview'}
          onChange={(e) => onUpdate({
            animation: { ...animation, trigger: e.target.value },
          })}
        >
          <MenuItem value="scroll">При скролле</MenuItem>
          <MenuItem value="inview">При появлении</MenuItem>
          <MenuItem value="hover">При наведении</MenuItem>
          <MenuItem value="click">При клике</MenuItem>
          <MenuItem value="loop">Цикл</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Эффект</InputLabel>
        <Select
          value={animation.effect || 'fade'}
          onChange={(e) => onUpdate({
            animation: { ...animation, effect: e.target.value },
          })}
        >
          <MenuItem value="fade">Fade</MenuItem>
          <MenuItem value="slide">Slide</MenuItem>
          <MenuItem value="zoom">Zoom</MenuItem>
          <MenuItem value="rotate">Rotate</MenuItem>
          <MenuItem value="scale">Scale</MenuItem>
          <MenuItem value="morph">Morph</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography gutterBottom>Задержка: {animation.delay || 0}s</Typography>
        <Slider
          value={(animation.delay || 0) * 10}
          onChange={(_, value) => onUpdate({
            animation: { ...animation, delay: (value as number) / 10 },
          })}
          min={0}
          max={20}
        />
      </Box>

      <Box>
        <Typography gutterBottom>Длительность: {animation.duration || 0.5}s</Typography>
        <Slider
          value={(animation.duration || 0.5) * 10}
          onChange={(_, value) => onUpdate({
            animation: { ...animation, duration: (value as number) / 10 },
          })}
          min={3}
          max={30}
        />
      </Box>
    </Box>
  );
}

function VisibilityTab({ block, deviceType, onUpdate }: { block: PageBlock; deviceType: DeviceType; onUpdate: (updates: any) => void }) {
  const display = block.styles?.display || {
    desktop: 'block',
    tablet: 'block',
    mobile: 'block',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Видимость</Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={display.desktop !== 'none'}
            onChange={(e) => onUpdate({
              display: {
                ...display,
                desktop: e.target.checked ? 'block' : 'none',
              },
            })}
          />
        }
        label="Desktop"
      />

      <FormControlLabel
        control={
          <Switch
            checked={display.tablet !== 'none'}
            onChange={(e) => onUpdate({
              display: {
                ...display,
                tablet: e.target.checked ? 'block' : 'none',
              },
            })}
          />
        }
        label="Tablet"
      />

      <FormControlLabel
        control={
          <Switch
            checked={display.mobile !== 'none'}
            onChange={(e) => onUpdate({
              display: {
                ...display,
                mobile: e.target.checked ? 'block' : 'none',
              },
            })}
          />
        }
        label="Mobile"
      />
    </Box>
  );
}

function AdvancedTab({ block, onUpdate }: { block: PageBlock; onUpdate: (updates: Partial<PageBlock>) => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2">Дополнительно</Typography>
      
      <TextField
        label="Custom CSS"
        multiline
        rows={6}
        fullWidth
        value={block.customCss || ''}
        onChange={(e) => onUpdate({ customCss: e.target.value })}
        placeholder=".my-class { color: red; }"
      />

      <TextField
        label="Custom JS"
        multiline
        rows={6}
        fullWidth
        value={block.customJs || ''}
        onChange={(e) => onUpdate({ customJs: e.target.value })}
        placeholder="console.log('Hello');"
      />

      <TextField
        label="Z-index"
        type="number"
        fullWidth
        value={block.styles?.zIndex || 0}
        onChange={(e) => onUpdate({
          styles: {
            ...block.styles,
            zIndex: parseInt(e.target.value) || 0,
          },
        })}
      />
    </Box>
  );
}
