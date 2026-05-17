import styles from './TicketPriceFilterCarousel.module.css';

export type PriceFilterChip = {
  priceKey: string;
  price: number;
  color: string;
  /** Для верхней ценовой категории — «28 700+ ₽» как на portalbilet */
  showPlus?: boolean;
};

type Props = {
  chips: PriceFilterChip[];
  selectedPriceKey: string | null;
  onSelect: (priceKey: string) => void;
  onReset: () => void;
};

function ResetIcon() {
  return (
    <svg className={styles.resetIcon} width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
      <path
        d="M0.0885911 0.215694L0.146447 0.146447C0.320013 -0.0271197 0.589437 -0.046405 0.784306 0.0885911L0.853553 0.146447L5.5 4.793L10.1464 0.146447C10.3417 -0.0488154 10.6583 -0.0488154 10.8536 0.146447C11.0488 0.341709 11.0488 0.658291 10.8536 0.853553L6.207 5.5L10.8536 10.1464C11.0271 10.32 11.0464 10.5894 10.9114 10.7843L10.8536 10.8536C10.68 11.0271 10.4106 11.0464 10.2157 10.9114L10.1464 10.8536L5.5 6.207L0.853553 10.8536C0.658291 11.0488 0.341709 11.0488 0.146447 10.8536C-0.0488154 10.6583 -0.0488154 10.3417 0.146447 10.1464L4.793 5.5L0.146447 0.853553C-0.0271197 0.679987 -0.046405 0.410563 0.0885911 0.215694L0.146447 0.146447L0.0885911 0.215694Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TicketPriceFilterCarousel({ chips, selectedPriceKey, onSelect, onReset }: Props) {
  if (chips.length === 0) return null;

  const hasSelection = selectedPriceKey != null;

  return (
    <div className={styles.root} data-testid="prices-filter-bar">
      <button
        type="button"
        className={styles.resetBtn}
        disabled={!hasSelection}
        onClick={onReset}
        aria-label="Сбросить фильтр по цене"
      >
        <ResetIcon />
        <span>Сбросить</span>
      </button>
      <div className={styles.scrollWrap} data-testid="prices-filter-list-wrapper">
        <ul className={styles.list} data-testid="prices-filter-list">
          {chips.map((chip) => {
            const selected = selectedPriceKey === chip.priceKey;
            return (
              <li key={chip.priceKey}>
                <button
                  type="button"
                  className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                  style={
                    selected
                      ? { borderColor: chip.color, color: chip.color }
                      : undefined
                  }
                  onClick={() => onSelect(chip.priceKey)}
                  aria-pressed={selected}
                  data-testid="price-filter-wrapper"
                >
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: chip.color }}
                    data-testid="price-filter-color-element"
                    aria-hidden
                  />
                  <span className={styles.priceText} data-testid="price-filter-value">
                    {chip.price.toLocaleString('ru-RU')}
                    {chip.showPlus ? '+' : ''}
                    <span className={styles.priceSuffix} aria-label="RUB">
                      {' '}
                      ₽
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
