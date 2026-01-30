import { Box, Typography, Container, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';

const SlideContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(8, 0),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)'
    : 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
  position: 'relative',
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(2rem, 4vw, 3rem)',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  color: '#ffffff',
}));

const SectionSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
  textAlign: 'center',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(6),
  maxWidth: '800px',
  marginLeft: 'auto',
  marginRight: 'auto',
}));

const ContactCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(135deg, #1d1d1d 0%, #252525 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
  border: `2px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
  borderRadius: '16px',
  maxWidth: '600px',
  margin: '0 auto',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(255, 187, 0, 0.15)'
      : '0 12px 40px rgba(0, 0, 0, 0.1)',
    borderColor: '#ffbb00',
  },
}));

const ContactItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2, 0),
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
  '&:last-child': {
    borderBottom: 'none',
  },
  '& .icon': {
    color: '#ffbb00',
    fontSize: '2rem',
    flexShrink: 0,
  },
  '& .content': {
    flex: 1,
  },
  '& .label': {
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  '& .value': {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
}));

interface Contact {
  name: string;
  phone?: string;
  email?: string;
}

interface ContactsSlideProps {
  content: {
    title?: string;
    subtitle?: string;
    contacts?: Contact[];
  };
}

export function ContactsSlide({ content }: ContactsSlideProps) {
  const theme = useTheme();

  return (
    <SlideContainer>
      <Container maxWidth="lg">
        {content.title && (
          <SectionTitle variant="h2">{content.title}</SectionTitle>
        )}
        {content.subtitle && (
          <SectionSubtitle>{content.subtitle}</SectionSubtitle>
        )}
        {content.contacts && content.contacts.length > 0 && (
          <ContactCard>
            {content.contacts.map((contact, index) => (
              <ContactItem key={index}>
                <PersonIcon className="icon" />
                <Box className="content">
                  <Box className="label">Контактное лицо</Box>
                  <Box className="value">{contact.name}</Box>
                </Box>
              </ContactItem>
            ))}
            {content.contacts.map((contact, index) => (
              contact.phone && (
                <ContactItem key={`phone-${index}`}>
                  <PhoneIcon className="icon" />
                  <Box className="content">
                    <Box className="label">Телефон</Box>
                    <Box className="value" component="a" href={`tel:${contact.phone}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                      {contact.phone}
                    </Box>
                  </Box>
                </ContactItem>
              )
            ))}
            {content.contacts.map((contact, index) => (
              contact.email && (
                <ContactItem key={`email-${index}`}>
                  <EmailIcon className="icon" />
                  <Box className="content">
                    <Box className="label">Электронная почта</Box>
                    <Box className="value" component="a" href={`mailto:${contact.email}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                      {contact.email}
                    </Box>
                  </Box>
                </ContactItem>
              )
            ))}
          </ContactCard>
        )}
      </Container>
    </SlideContainer>
  );
}

