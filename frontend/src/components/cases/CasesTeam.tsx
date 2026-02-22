import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import { getPublicCase } from '@/services/publicApi';
import { getPublicTeamMembers } from '@/services/cmsApi';
import { TeamCarousel } from './TeamCarousel';
import { TeamMember } from '@/types/cms';

/**
 * Секция с командой проекта
 * Если в кейсе указаны сотрудники (contentJson.team.members) — показываем только их.
 * Иначе — всех активных из вкладки Команда.
 */
export function CasesTeam() {
  const { slug } = useParams<{ slug?: string }>();

  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const { data: allTeamMembers = [], isLoading } = useQuery({
    queryKey: ['public-team-members'],
    queryFn: () => getPublicTeamMembers(),
    staleTime: 30000,
  });

  const caseTeam = caseData?.contentJson?.team;
  const caseMemberIds = (caseTeam?.members as { teamMemberId?: number }[])?.map((m) => m.teamMemberId).filter(Boolean) || [];

  const teamMembers: TeamMember[] = caseMemberIds.length > 0
    ? caseMemberIds
        .map((id) => allTeamMembers.find((tm) => tm.id === id))
        .filter(Boolean) as TeamMember[]
    : allTeamMembers;

  if (isLoading) {
    return (
      <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, my: 8 }}>
        <Typography
          variant="h3"
          sx={{
            fontSize: { xs: '1.5rem', md: '2rem' },
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            mb: 2,
          }}
        >
          Наша команда
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#fff' }} />
        </Box>
      </Container>
    );
  }

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <Container maxWidth={false} sx={{ maxWidth: '1170px', mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, my: 8 }}>
      <Typography
        variant="h3"
        sx={{
          fontSize: { xs: '1.5rem', md: '2rem' },
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.7)',
          mb: 2,
        }}
      >
        Наша команда
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: '1rem', md: '1.125rem' },
          color: 'rgba(255, 255, 255, 0.9)',
          mb: 4,
        }}
      >
        Специалисты, работающие над проектом
      </Typography>
      <Box sx={{ mt: 4 }}>
        <TeamCarousel members={teamMembers} />
      </Box>
    </Container>
  );
}

