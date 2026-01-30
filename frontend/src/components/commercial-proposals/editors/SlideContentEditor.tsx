import { Box, TextField, Typography, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ProposalSlideContent, ProposalSlideType } from '@/types/cms';

interface SlideContentEditorProps {
  slideType: ProposalSlideType;
  content: ProposalSlideContent;
  onChange: (content: ProposalSlideContent) => void;
}

export function SlideContentEditor({ slideType, content, onChange }: SlideContentEditorProps) {
  const updateContent = (updates: Partial<ProposalSlideContent>) => {
    onChange({ ...content, ...updates });
  };

  switch (slideType) {
    case 'hero':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Заголовок"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
            multiline
            rows={2}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            rows={4}
            value={content.description || ''}
            onChange={(e) => updateContent({ description: e.target.value })}
          />
        </Box>
      );

    case 'services':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.services || []).map((service, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Услуга {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newServices = [...(content.services || [])];
                    newServices.splice(index, 1);
                    updateContent({ services: newServices });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Название услуги"
                fullWidth
                sx={{ mb: 2 }}
                value={service.title}
                onChange={(e) => {
                  const newServices = [...(content.services || [])];
                  newServices[index] = { ...service, title: e.target.value };
                  updateContent({ services: newServices });
                }}
              />
              <TextField
                label="Описание"
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
                value={service.description}
                onChange={(e) => {
                  const newServices = [...(content.services || [])];
                  newServices[index] = { ...service, description: e.target.value };
                  updateContent({ services: newServices });
                }}
              />
              {(service.items || []).map((item, itemIndex) => (
                <Box key={itemIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={item}
                    onChange={(e) => {
                      const newServices = [...(content.services || [])];
                      const newItems = [...(service.items || [])];
                      newItems[itemIndex] = e.target.value;
                      newServices[index] = { ...service, items: newItems };
                      updateContent({ services: newServices });
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newServices = [...(content.services || [])];
                      const newItems = [...(service.items || [])];
                      newItems.splice(itemIndex, 1);
                      newServices[index] = { ...service, items: newItems };
                      updateContent({ services: newServices });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  const newServices = [...(content.services || [])];
                  const newItems = [...(service.items || []), ''];
                  newServices[index] = { ...service, items: newItems };
                  updateContent({ services: newServices });
                }}
              >
                Добавить пункт
              </Button>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                services: [...(content.services || []), { title: '', description: '', items: [] }],
              });
            }}
          >
            Добавить услугу
          </Button>
        </Box>
      );

    case 'metrics':
    case 'value':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.metrics || []).map((metric, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Метрика {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newMetrics = [...(content.metrics || [])];
                    newMetrics.splice(index, 1);
                    updateContent({ metrics: newMetrics });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Значение"
                fullWidth
                sx={{ mb: 2 }}
                value={metric.value}
                onChange={(e) => {
                  const newMetrics = [...(content.metrics || [])];
                  newMetrics[index] = { ...metric, value: e.target.value };
                  updateContent({ metrics: newMetrics });
                }}
              />
              <TextField
                label="Подпись"
                fullWidth
                sx={{ mb: 2 }}
                value={metric.label}
                onChange={(e) => {
                  const newMetrics = [...(content.metrics || [])];
                  newMetrics[index] = { ...metric, label: e.target.value };
                  updateContent({ metrics: newMetrics });
                }}
              />
              <TextField
                label="Изменение (опционально)"
                fullWidth
                sx={{ mb: 2 }}
                value={metric.change || ''}
                onChange={(e) => {
                  const newMetrics = [...(content.metrics || [])];
                  newMetrics[index] = { ...metric, change: e.target.value };
                  updateContent({ metrics: newMetrics });
                }}
              />
              <TextField
                label="Описание"
                fullWidth
                multiline
                rows={2}
                value={metric.description || ''}
                onChange={(e) => {
                  const newMetrics = [...(content.metrics || [])];
                  newMetrics[index] = { ...metric, description: e.target.value };
                  updateContent({ metrics: newMetrics });
                }}
              />
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                metrics: [...(content.metrics || []), { value: '', label: '', description: '' }],
              });
            }}
          >
            Добавить метрику
          </Button>
        </Box>
      );

    case 'roadmap':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.phases || []).map((phase, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Этап {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newPhases = [...(content.phases || [])];
                    newPhases.splice(index, 1);
                    updateContent({ phases: newPhases });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Название этапа"
                fullWidth
                sx={{ mb: 2 }}
                value={phase.title}
                onChange={(e) => {
                  const newPhases = [...(content.phases || [])];
                  newPhases[index] = { ...phase, title: e.target.value };
                  updateContent({ phases: newPhases });
                }}
              />
              <TextField
                label="Период"
                fullWidth
                sx={{ mb: 2 }}
                value={phase.period}
                onChange={(e) => {
                  const newPhases = [...(content.phases || [])];
                  newPhases[index] = { ...phase, period: e.target.value };
                  updateContent({ phases: newPhases });
                }}
              />
              {(phase.actions || []).map((action, actionIndex) => (
                <Box key={actionIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={action}
                    onChange={(e) => {
                      const newPhases = [...(content.phases || [])];
                      const newActions = [...(phase.actions || [])];
                      newActions[actionIndex] = e.target.value;
                      newPhases[index] = { ...phase, actions: newActions };
                      updateContent({ phases: newPhases });
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newPhases = [...(content.phases || [])];
                      const newActions = [...(phase.actions || [])];
                      newActions.splice(actionIndex, 1);
                      newPhases[index] = { ...phase, actions: newActions };
                      updateContent({ phases: newPhases });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                size="small"
                sx={{ mb: 2 }}
                onClick={() => {
                  const newPhases = [...(content.phases || [])];
                  const newActions = [...(phase.actions || []), ''];
                  newPhases[index] = { ...phase, actions: newActions };
                  updateContent({ phases: newPhases });
                }}
              >
                Добавить действие
              </Button>
              <TextField
                label="Результат"
                fullWidth
                value={phase.result}
                onChange={(e) => {
                  const newPhases = [...(content.phases || [])];
                  newPhases[index] = { ...phase, result: e.target.value };
                  updateContent({ phases: newPhases });
                }}
              />
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                phases: [...(content.phases || []), { title: '', period: '', actions: [], result: '' }],
              });
            }}
          >
            Добавить этап
          </Button>
        </Box>
      );

    case 'guarantees':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.guarantees || []).map((guarantee, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Гарантия {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newGuarantees = [...(content.guarantees || [])];
                    newGuarantees.splice(index, 1);
                    updateContent({ guarantees: newGuarantees });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Название гарантии"
                fullWidth
                sx={{ mb: 2 }}
                value={guarantee.title}
                onChange={(e) => {
                  const newGuarantees = [...(content.guarantees || [])];
                  newGuarantees[index] = { ...guarantee, title: e.target.value };
                  updateContent({ guarantees: newGuarantees });
                }}
              />
              <TextField
                label="Описание"
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
                value={guarantee.description}
                onChange={(e) => {
                  const newGuarantees = [...(content.guarantees || [])];
                  newGuarantees[index] = { ...guarantee, description: e.target.value };
                  updateContent({ guarantees: newGuarantees });
                }}
              />
              {(guarantee.items || []).map((item, itemIndex) => (
                <Box key={itemIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={item}
                    onChange={(e) => {
                      const newGuarantees = [...(content.guarantees || [])];
                      const newItems = [...(guarantee.items || [])];
                      newItems[itemIndex] = e.target.value;
                      newGuarantees[index] = { ...guarantee, items: newItems };
                      updateContent({ guarantees: newGuarantees });
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newGuarantees = [...(content.guarantees || [])];
                      const newItems = [...(guarantee.items || [])];
                      newItems.splice(itemIndex, 1);
                      newGuarantees[index] = { ...guarantee, items: newItems };
                      updateContent({ guarantees: newGuarantees });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  const newGuarantees = [...(content.guarantees || [])];
                  const newItems = [...(guarantee.items || []), ''];
                  newGuarantees[index] = { ...guarantee, items: newItems };
                  updateContent({ guarantees: newGuarantees });
                }}
              >
                Добавить пункт
              </Button>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                guarantees: [...(content.guarantees || []), { title: '', description: '', items: [] }],
              });
            }}
          >
            Добавить гарантию
          </Button>
        </Box>
      );

    case 'contacts':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.contacts || []).map((contact, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Контакт {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newContacts = [...(content.contacts || [])];
                    newContacts.splice(index, 1);
                    updateContent({ contacts: newContacts });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Имя"
                fullWidth
                sx={{ mb: 2 }}
                value={contact.name}
                onChange={(e) => {
                  const newContacts = [...(content.contacts || [])];
                  newContacts[index] = { ...contact, name: e.target.value };
                  updateContent({ contacts: newContacts });
                }}
              />
              <TextField
                label="Телефон"
                fullWidth
                sx={{ mb: 2 }}
                value={contact.phone || ''}
                onChange={(e) => {
                  const newContacts = [...(content.contacts || [])];
                  newContacts[index] = { ...contact, phone: e.target.value };
                  updateContent({ contacts: newContacts });
                }}
              />
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={contact.email || ''}
                onChange={(e) => {
                  const newContacts = [...(content.contacts || [])];
                  newContacts[index] = { ...contact, email: e.target.value };
                  updateContent({ contacts: newContacts });
                }}
              />
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                contacts: [...(content.contacts || []), { name: '', phone: '', email: '' }],
              });
            }}
          >
            Добавить контакт
          </Button>
        </Box>
      );

    case 'problems':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.problems || []).map((problem, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Проблема {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newProblems = [...(content.problems || [])];
                    newProblems.splice(index, 1);
                    updateContent({ problems: newProblems });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Название проблемы"
                fullWidth
                sx={{ mb: 2 }}
                value={problem.title}
                onChange={(e) => {
                  const newProblems = [...(content.problems || [])];
                  newProblems[index] = { ...problem, title: e.target.value };
                  updateContent({ problems: newProblems });
                }}
              />
              {(problem.items || []).map((item, itemIndex) => (
                <Box key={itemIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={item}
                    onChange={(e) => {
                      const newProblems = [...(content.problems || [])];
                      const newItems = [...(problem.items || [])];
                      newItems[itemIndex] = e.target.value;
                      newProblems[index] = { ...problem, items: newItems };
                      updateContent({ problems: newProblems });
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newProblems = [...(content.problems || [])];
                      const newItems = [...(problem.items || [])];
                      newItems.splice(itemIndex, 1);
                      newProblems[index] = { ...problem, items: newItems };
                      updateContent({ problems: newProblems });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                size="small"
                sx={{ mb: 2 }}
                onClick={() => {
                  const newProblems = [...(content.problems || [])];
                  const newItems = [...(problem.items || []), ''];
                  newProblems[index] = { ...problem, items: newItems };
                  updateContent({ problems: newProblems });
                }}
              >
                Добавить пункт
              </Button>
              <TextField
                label="Решение"
                fullWidth
                multiline
                rows={2}
                value={problem.solution || ''}
                onChange={(e) => {
                  const newProblems = [...(content.problems || [])];
                  newProblems[index] = { ...problem, solution: e.target.value };
                  updateContent({ problems: newProblems });
                }}
              />
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                problems: [...(content.problems || []), { title: '', items: [], solution: '' }],
              });
            }}
          >
            Добавить проблему
          </Button>
        </Box>
      );

    case 'pricing':
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Заголовок секции"
            fullWidth
            value={content.title || ''}
            onChange={(e) => updateContent({ title: e.target.value })}
          />
          <TextField
            label="Подзаголовок"
            fullWidth
            value={content.subtitle || ''}
            onChange={(e) => updateContent({ subtitle: e.target.value })}
          />
          {(content.packages || []).map((pkg, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Пакет {index + 1}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => {
                    const newPackages = [...(content.packages || [])];
                    newPackages.splice(index, 1);
                    updateContent({ packages: newPackages });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <TextField
                label="Название пакета"
                fullWidth
                sx={{ mb: 2 }}
                value={pkg.name}
                onChange={(e) => {
                  const newPackages = [...(content.packages || [])];
                  newPackages[index] = { ...pkg, name: e.target.value };
                  updateContent({ packages: newPackages });
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Цена"
                  fullWidth
                  value={pkg.price}
                  onChange={(e) => {
                    const newPackages = [...(content.packages || [])];
                    newPackages[index] = { ...pkg, price: e.target.value };
                    updateContent({ packages: newPackages });
                  }}
                />
                <TextField
                  label="Период"
                  fullWidth
                  value={pkg.period || ''}
                  onChange={(e) => {
                    const newPackages = [...(content.packages || [])];
                    newPackages[index] = { ...pkg, period: e.target.value };
                    updateContent({ packages: newPackages });
                  }}
                />
              </Box>
              <TextField
                label="Описание"
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
                value={pkg.description || ''}
                onChange={(e) => {
                  const newPackages = [...(content.packages || [])];
                  newPackages[index] = { ...pkg, description: e.target.value };
                  updateContent({ packages: newPackages });
                }}
              />
              {(pkg.features || []).map((feature, featureIndex) => (
                <Box key={featureIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    value={feature}
                    onChange={(e) => {
                      const newPackages = [...(content.packages || [])];
                      const newFeatures = [...(pkg.features || [])];
                      newFeatures[featureIndex] = e.target.value;
                      newPackages[index] = { ...pkg, features: newFeatures };
                      updateContent({ packages: newPackages });
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newPackages = [...(content.packages || [])];
                      const newFeatures = [...(pkg.features || [])];
                      newFeatures.splice(featureIndex, 1);
                      newPackages[index] = { ...pkg, features: newFeatures };
                      updateContent({ packages: newPackages });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  const newPackages = [...(content.packages || [])];
                  const newFeatures = [...(pkg.features || []), ''];
                  newPackages[index] = { ...pkg, features: newFeatures };
                  updateContent({ packages: newPackages });
                }}
              >
                Добавить функцию
              </Button>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => {
              updateContent({
                packages: [...(content.packages || []), { name: '', price: '', period: '', features: [] }],
              });
            }}
          >
            Добавить пакет
          </Button>
        </Box>
      );

    default:
      return (
        <TextField
          label="JSON контент"
          fullWidth
          multiline
          rows={10}
          value={JSON.stringify(content, null, 2)}
          onChange={(e) => {
            try {
              updateContent(JSON.parse(e.target.value));
            } catch {
              // Invalid JSON, ignore
            }
          }}
        />
      );
  }
}

