import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import { getPublicCase } from '@/services/publicApi';
import { getPublicTeamMembers } from '@/services/cmsApi';
import { TeamCarousel } from './TeamCarousel';
import { TeamMember } from '@/types/cms';
import { pickTeamFromPool } from '@/utils/caseTeamPick';

type CaseTeamRow = {
  teamMemberId?: number;
  name?: string;
  role?: string;
  imageUrl?: string;
};

function resolveMembers(rows: CaseTeamRow[], fromApi: TeamMember[]): TeamMember[] {
  return rows
    .map((row) => {
      const id = Number(row.teamMemberId);
      if (!Number.isFinite(id) || id <= 0) return null;
      const live = fromApi.find((tm) => tm.id === id);
      if (live) return live;
      return {
        id,
        name: row.name?.trim() || 'Сотрудник',
        role: row.role?.trim() || '',
        imageUrl: row.imageUrl,
        isActive: true,
        sortOrder: 0,
      } as TeamMember;
    })
    .filter(Boolean) as TeamMember[];
}

/**
 * Секция «Наша команда»:
 * — если в админке заданы люди (contentJson.team.members) — показываем их;
 * — иначе — до N человек из публичного списка: релевантные по skills/tools кейса + стабильный random по slug.
 */
export function CasesTeam() {
  const { slug } = useParams<{ slug?: string }>();

  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const rawRows: CaseTeamRow[] = (caseData?.contentJson?.team?.members as CaseTeamRow[]) || [];
  const hasSelection = rawRows.some((r) => Number(r.teamMemberId) > 0);

  const { data: allTeamMembers = [], isLoading } = useQuery({
    queryKey: ['public-team-members'],
    queryFn: () => getPublicTeamMembers(),
    staleTime: 30000,
    enabled: !!slug,
  });

  const caseTools = Array.isArray(caseData?.tools) ? (caseData.tools as string[]) : [];
  const maxRandom = (() => {
    const n = Number((caseData?.contentJson?.team as { maxRandom?: number } | undefined)?.maxRandom);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return Math.floor(n);
    return 5;
  })();

  const curated = hasSelection ? resolveMembers(rawRows, allTeamMembers) : [];
  const teamMembers =
    curated.length > 0
      ? curated
      : pickTeamFromPool(allTeamMembers, slug || '', caseTools, maxRandom);

  if (!isLoading && teamMembers.length === 0) {
    return null;
  }

  /** Пока грузим пул, не показываем пустой блок; если уже есть кураторский список — не ждём */
  if (isLoading && teamMembers.length === 0) {
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

