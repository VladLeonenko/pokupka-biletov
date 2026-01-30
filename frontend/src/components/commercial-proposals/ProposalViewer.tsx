import { Box } from '@mui/material';
import { CommercialProposal, ProposalSlide } from '@/types/cms';
import { HeroSlide } from './slides/HeroSlide';
import { ServicesSlide } from './slides/ServicesSlide';
import { MetricsSlide } from './slides/MetricsSlide';
import { RoadmapSlide } from './slides/RoadmapSlide';
import { GuaranteesSlide } from './slides/GuaranteesSlide';
import { ContactsSlide } from './slides/ContactsSlide';
import { ProblemsSlide } from './slides/ProblemsSlide';
import { PricingSlide } from './slides/PricingSlide';

interface ProposalViewerProps {
  proposal: CommercialProposal;
}

function renderSlide(slide: ProposalSlide) {
  switch (slide.slideType) {
    case 'hero':
      return <HeroSlide key={slide.id} content={slide.content} />;
    case 'services':
      return <ServicesSlide key={slide.id} content={slide.content} />;
    case 'metrics':
    case 'value':
      return <MetricsSlide key={slide.id} content={slide.content} />;
    case 'roadmap':
      return <RoadmapSlide key={slide.id} content={slide.content} />;
    case 'guarantees':
      return <GuaranteesSlide key={slide.id} content={slide.content} />;
    case 'contacts':
      return <ContactsSlide key={slide.id} content={slide.content} />;
    case 'problems':
      return <ProblemsSlide key={slide.id} content={slide.content} />;
    case 'pricing':
      return <PricingSlide key={slide.id} content={slide.content} />;
    default:
      return (
        <Box key={slide.id} sx={{ minHeight: '100vh', p: 4 }}>
          Unknown slide type: {slide.slideType}
        </Box>
      );
  }
}

export function ProposalViewer({ proposal }: ProposalViewerProps) {
  if (!proposal.slides || proposal.slides.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Нет слайдов для отображения
      </Box>
    );
  }

  // Сортируем слайды по sortOrder
  const sortedSlides = [...proposal.slides].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <Box id="proposal-export-container" sx={{ width: '100%', overflowX: 'hidden' }}>
      {sortedSlides.map((slide, index) => (
        <Box key={slide.id || index} data-slide={slide.slideType}>
          {renderSlide(slide)}
        </Box>
      ))}
    </Box>
  );
}

