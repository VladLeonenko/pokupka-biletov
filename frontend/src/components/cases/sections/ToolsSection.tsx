import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import styles from './ToolsSection.module.css';

const textStyles = {
  sectionTitle: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 700,
    fontSize: '48px',
    lineHeight: 1.5,
    color: '#141414',
    margin: 0,
  },
  description: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '24px',
    lineHeight: 1.5,
    color: '#141414',
    margin: 0,
  },
};

export function ToolsSection() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const toolsData = caseData?.contentJson?.tools || {};
  const title = toolsData.title || 'Инструменты';
  const description = toolsData.description || '';
  const ctaText = toolsData.ctaText || 'Понравился проект? Узнайте стоимость своего проекта.';
  const tools = toolsData.items || toolsData.list || [];

  if (tools.length === 0) {
    return null;
  }

  const rows = [];
  for (let i = 0; i < tools.length; i += 3) {
    rows.push(tools.slice(i, i + 3));
  }

  return (
    <section className={styles.tools}>
      <div className={styles.toolsContainer}>
        <h2 style={textStyles.sectionTitle}>{title}</h2>

        <div className={styles.toolsContent}>
          <div className={styles.toolsDescription}>
            {description && (
              <div className={styles.descriptionText}>
                {description.split('\n').map((line: string, i: number) => (
                  <p key={i} style={textStyles.description}>{line}</p>
                ))}
              </div>
            )}
            <p style={textStyles.description}>{ctaText}</p>
            <button 
              className={styles.ctaButton}
              onClick={() => navigate('/calculator')}
            >
              Узнать стоимость
            </button>
          </div>

          <div className={styles.toolsGrid}>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className={styles.toolsRow}>
                {row.map((tool: any, toolIndex: number) => (
                  <div key={toolIndex} className={styles.toolCard} title={tool.name}>
                    <img 
                      src={tool.icon} 
                      alt={tool.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
