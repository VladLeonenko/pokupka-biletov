import { useState } from 'react';
import { Box, Container, Typography, Button, Stack } from '@mui/material';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PetsIcon from '@mui/icons-material/Pets';
import ElderlyIcon from '@mui/icons-material/Elderly';
import PeopleIcon from '@mui/icons-material/People';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import { PageHeader } from '@/components/common/PageHeader';

const funds = [
  { id: 'podari-zhizn', name: 'Подари жизнь', desc: 'Помощь детям с онкологическими заболеваниями', icon: <ChildCareIcon />, impact: '30 000+ детей', site: 'podari-zhizn.ru' },
  { id: 'rusfond', name: 'Русфонд', desc: 'Помощь тяжелобольным детям и взрослым', icon: <FavoriteIcon />, impact: '50 000+ людей', site: 'rusfond.ru' },
  { id: 'starost', name: 'Старость в радость', desc: 'Помощь одиноким пожилым людям', icon: <ElderlyIcon />, impact: '200+ домов', site: 'starikam.org' },
  { id: 'khabenskiy', name: 'Фонд Хабенского', desc: 'Помощь детям с заболеваниями мозга', icon: <ChildCareIcon />, impact: '10 000+ детей', site: 'bfkh.ru' },
  { id: 'avz', name: 'АВЗ — Зоозащита', desc: 'Помощь бездомным животным', icon: <PetsIcon />, impact: '100 000+ животных', site: 'avz.su' },
  { id: 'donate-stream', name: 'Donate.Stream', desc: 'Сбор средств на лечение детей', icon: <VolunteerActivismIcon />, impact: '500+ млн ₽', site: 'donate-stream.ru' },
  { id: 'nochlezhka', name: 'Ночлежка', desc: 'Питание, ночлег и адаптация бездомных', icon: <PeopleIcon />, impact: '50 000+ человек', site: 'homeless.ru' },
  { id: 'zhizn', name: 'Жизнь как чудо', desc: 'Сбор средств на лечение детей', icon: <ChildCareIcon />, impact: '3 000+ детей', site: 'miracle.ru' },
  { id: 'adresmilk', name: 'Адреса милосердия', desc: 'Социальная помощь пожилым на дому', icon: <ElderlyIcon />, impact: '5 000+ людей', site: 'adresmilk.ru' },
];

const stats = [
  { val: '10%', label: 'от каждого проекта' },
  { val: '9', label: 'фондов' },
  { val: '2017', label: 'начали помогать' },
];

export function CharityPage() {
  const [selected, setSelected] = useState('podari-zhizn');

  return (
    <>
      <SeoMetaTags
        title="Благотворительность — PrimeCoder"
        description="Часть средств от каждого проекта идёт на благотворительность. Выберите фонд."
        keywords="благотворительность, помощь, фонды, PrimeCoder"
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <Box component="main" sx={{ minHeight: '100vh', color: '#fff', pt: { xs: 6.25, md: 6.25 }, pb: 8 }}>
        <Container maxWidth="lg">
          <PageHeader
            overline="Благотворительность"
            title="Мы помогаем вместе с вами"
            description="Часть средств от каждого проекта направляется в благотворительные фонды. Вы можете выбрать фонд, который вам близок."
            decoText="CHARITY"
          />

          {/* Stats */}
          <Stack direction="row" spacing={{ xs: 4, md: 8 }} sx={{ mb: 6 }} data-anim="fade-up">
            {stats.map((s) => (
              <Box key={s.label}>
                <Typography sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.val}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.3 }}>{s.label}</Typography>
              </Box>
            ))}
          </Stack>

          {/* Funds grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: 3, mb: 5 }} data-anim="stagger">
            {funds.map((f) => {
              const active = selected === f.id;
              return (
                <Box
                  key={f.id}
                  data-anim-child
                  onClick={() => { setSelected(f.id); localStorage.setItem('selectedCharityFund', f.id); }}
                  sx={{
                    p: 3, borderRadius: 3, cursor: 'pointer',
                    border: '1px solid', borderColor: active ? '#ffbb00' : 'rgba(255,255,255,0.06)',
                    bgcolor: active ? 'rgba(255,187,0,0.06)' : 'rgba(20,20,20,0.5)',
                    transition: 'border-color 0.3s, background 0.3s, transform 0.3s',
                    '&:hover': { borderColor: 'rgba(255,187,0,0.4)', transform: 'translateY(-4px)' },
                  }}
                >
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: active ? 'rgba(255,187,0,0.2)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, '& svg': { fontSize: 24, color: active ? '#ffbb00' : 'rgba(255,255,255,0.5)' } }}>
                    {f.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '1.05rem', mb: 0.5 }}>{f.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, mb: 1 }}>{f.desc}</Typography>
                  <Typography variant="caption" sx={{ color: '#ffbb00', fontWeight: 600 }}>{f.impact}</Typography>
                </Box>
              );
            })}
          </Box>

          <Box data-anim="fade-up" sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', mb: 2 }}>
              Компания PrimeCoder с 2017 года направляет часть выручки в благотворительные фонды. Спасибо, что помогаете вместе с нами.
            </Typography>
            <Button href="/new-client" sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}>
              Стать клиентом
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}
