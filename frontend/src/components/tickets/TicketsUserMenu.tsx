import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton, Menu, MenuItem, Popover } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useAuth } from '@/auth/AuthProvider';
import { getBiletMeta, fetchBiletCities } from '@/services/biletPublicApi';
import { fetchPublicTicketsVitrine } from '@/services/ticketsVitrineApi';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';
import {
  getTicketsCityLabel,
  resolveCityLabel,
  setTicketsCity,
} from '@/utils/ticketsCity';
import { useTicketsCityId } from '@/hooks/useTicketsCityId';
import styles from './TicketsUserMenu.module.css';

export function TicketsUserMenu() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentCityId = useTicketsCityId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [cityMenuAnchor, setCityMenuAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  useEffect(() => {
    if (!open) setCityMenuAnchor(null);
  }, [open]);

  const onOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
  }, []);

  const onClose = useCallback(() => setAnchor(null), []);

  const goLogin = useCallback(() => {
    onClose();
    navigate('/admin/login');
  }, [navigate, onClose]);

  const goAccount = useCallback(() => {
    onClose();
    navigate('/account');
  }, [navigate, onClose]);

  const { data: biletMeta } = useQuery({
    queryKey: ['bilet-meta'],
    queryFn: getBiletMeta,
    staleTime: 600_000,
  });

  const { data: vitrineRes } = useQuery({
    queryKey: ['tickets-vitrine'],
    queryFn: fetchPublicTicketsVitrine,
    staleTime: 120_000,
  });

  const vitrine = useMemo(() => mergeTicketsVitrine(vitrineRes?.content), [vitrineRes]);

  const { data: apiCities = [] } = useQuery({
    queryKey: ['bilet-cities'],
    queryFn: fetchBiletCities,
    staleTime: 3600_000,
    retry: false,
    /** В GetBilet REST v2.2 нет /cities — не дергаем (убирает 501 в Network) */
    enabled: Boolean(biletMeta && !biletMeta.restV2),
  });

  const cityOptions = useMemo(() => {
    if (apiCities.length > 0) return apiCities;
    return vitrine.cities ?? [];
  }, [apiCities, vitrine.cities]);

  const displayCityLabel = useMemo(() => {
    const saved = getTicketsCityLabel();
    if (saved) return saved;
    if (cityOptions.length > 0) return resolveCityLabel(currentCityId, cityOptions);
    return currentCityId;
  }, [currentCityId, cityOptions]);

  const onPickCity = useCallback(
    (id: string, label: string) => {
      setTicketsCity(id, label);
      setCityMenuAnchor(null);
      queryClient.invalidateQueries({ queryKey: ['bilet-events-public'] });
      queryClient.invalidateQueries({ queryKey: ['bilet-venues-public'] });
    },
    [queryClient],
  );

  return (
    <>
      <IconButton
        size="medium"
        className={styles.anchor}
        aria-label="Профиль и помощь"
        aria-haspopup="true"
        aria-expanded={open ? 'true' : 'false'}
        onClick={onOpen}
        sx={{ color: 'inherit' }}
      >
        <PersonOutlineIcon />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { className: styles.paper, elevation: 0 },
        }}
        disableScrollLock
      >
        {!token || !user ? (
          <div className={styles.top}>
            <h2 className={styles.title}>Войдите в аккаунт</h2>
            <p className={styles.sub}>
              Для доступа к вашим билетам, акциям и избранным событиям
            </p>
            <button type="button" className={styles.cta} onClick={goLogin}>
              Войти
            </button>
          </div>
        ) : (
          <div className={`${styles.top} ${styles.topLogged}`}>
            <p className={styles.email}>{user.email}</p>
            <p className={styles.hint}>Заказы, избранное и настройки</p>
            <div className={styles.rowActions}>
              <button type="button" className={styles.cta} onClick={goAccount}>
                Личный кабинет
              </button>
              {['admin', 'sales_manager'].includes(user.role ?? '') ? (
                <Link className={styles.secondary} to="/admin" onClick={onClose}>
                  Панель организатора
                </Link>
              ) : null}
              <button type="button" className={`${styles.secondary} ${styles.ghost}`} onClick={() => { logout(); onClose(); }}>
                Выйти
              </button>
            </div>
          </div>
        )}

        <div className={styles.sep} role="separator" />

        <div className={styles.list}>
          <button
            type="button"
            className={`${styles.item} ${styles.cityBtn}`}
            aria-haspopup="menu"
            aria-expanded={Boolean(cityMenuAnchor)}
            aria-label="Выбрать город"
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              setCityMenuAnchor(ev.currentTarget);
            }}
          >
            <span className={styles.itemIcon}>
              <PlaceOutlinedIcon sx={{ fontSize: 22 }} />
            </span>
            <div className={styles.itemMain}>
              <div className={styles.itemLabel}>{displayCityLabel}</div>
              <div className={styles.itemNote}>
                {biletMeta?.cityIdRequired ? 'Афиша по городу' : 'Каталог общий; метка для интерфейса'}
              </div>
            </div>
            <KeyboardArrowRightIcon sx={{ fontSize: 20, opacity: 0.45, flexShrink: 0 }} aria-hidden />
          </button>

          <Menu
            disablePortal
            anchorEl={cityMenuAnchor}
            open={Boolean(cityMenuAnchor)}
            onClose={() => setCityMenuAnchor(null)}
            slotProps={{
              paper: { sx: { maxHeight: 320, minWidth: 220 } },
            }}
          >
            {cityOptions.map((c) => (
              <MenuItem
                key={c.id}
                selected={c.id === currentCityId}
                onClick={() => onPickCity(c.id, c.label)}
              >
                <CheckIcon
                  sx={{
                    fontSize: 18,
                    mr: 1,
                    opacity: c.id === currentCityId ? 1 : 0,
                    width: 18,
                  }}
                  aria-hidden
                />
                {c.label}
              </MenuItem>
            ))}
          </Menu>

          <Link className={styles.item} to="/returns" onClick={onClose}>
            <span className={styles.itemIcon}>
              <AssignmentReturnOutlinedIcon sx={{ fontSize: 22 }} />
            </span>
            <div className={styles.itemMain}>
              <div className={styles.itemLabel}>Возврат и обмен</div>
              <div className={styles.itemNote}>Как это устроено</div>
            </div>
          </Link>

          <Link className={styles.item} to="/faq" onClick={onClose}>
            <span className={styles.itemIcon}>
              <HelpOutlineOutlinedIcon sx={{ fontSize: 22 }} />
            </span>
            <div className={styles.itemMain}>
              <div className={styles.itemLabel}>Частые вопросы</div>
              <div className={styles.itemNote}>Ответы о покупке и билетах</div>
            </div>
          </Link>

          <Link className={styles.item} to="/contacts#contacts-form" onClick={onClose}>
            <span className={styles.itemIcon}>
              <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 22 }} />
            </span>
            <div className={styles.itemMain}>
              <div className={styles.itemLabel}>Написать в поддержку</div>
              <div className={styles.itemNote}>Форма на странице контактов</div>
            </div>
          </Link>
        </div>

        <Link className={styles.promo} to="/contacts" onClick={onClose}>
          <div className={styles.promoIcon} aria-hidden>
            💬
          </div>
          <div>
            <div className={styles.promoTitle}>Нужна помощь с билетом?</div>
            <div className={styles.promoText}>
              Опишите ситуацию в форме — ответим в рабочее время.
            </div>
          </div>
        </Link>
      </Popover>
    </>
  );
}
