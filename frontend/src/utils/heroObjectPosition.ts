/**
 * Куда смотрит широкий hero. Снято детектором лиц по каталогу:
 * запись есть только если центральный кроп срезает лицо. Остальные — center.
 */
const HERO_FOCUS: ReadonlyArray<readonly [string, string]> = [
  ['/uploads/images/event-6735c3a7569a15f2087b7b1d-1793985953245.jpg', 'center 38%'],
  ['/uploads/images/event-6735c3a7569a15f2087b7b25-1793986320853.jpg', 'center 32%'],
  ['/uploads/images/event-6735c3a7569a15f2087b7b4f-1793985950905.jpg', 'center 27%'],
  ['/uploads/images/event-6735c3a7569a15f2087b7d6b-1793985955571.jpg', 'center 13%'],
  ['/uploads/images/event-6735c3a7569a15f2087b7e86-1793986397177.jpg', 'center 10%'],
  ['/uploads/images/event-6735c3a7569a15f2087b7fd1-1793986667862.jpg', 'center top'],
  ['/uploads/images/event-6735c3a7569a15f2087b8003-1793985794860.jpg', 'center 18%'],
  ['/uploads/images/event-6735c3a7569a15f2087b8429-1793986438917.jpg', 'center top'],
  ['/uploads/images/event-6735c3a7569a15f2087b89c3-1793986189753.jpg', 'center top'],
  ['/uploads/images/event-6735c3a7569a15f2087b8a26-1793986590463.jpg', 'center top'],
  ['/uploads/images/event-6735c3a7569a15f2087b8c86-1793986538647.jpg', 'center 13%'],
  ['/uploads/images/event-6735c3a7569a15f2087b8ca1-1793986251532.jpg', 'center top'],
  ['/uploads/images/event-6735c3a7569a15f2087b90bc-1793985940896.jpg', 'center top'],
  ['/uploads/images/event-6735c3a7569a15f2087b90bd-1793986318471.jpg', 'center top'],
  ['/uploads/images/event-6735c3a8569a15f2087b922f-1793986704448.jpg', 'center top'],
  ['/uploads/images/event-6735c3a8569a15f2087b967a-1793986385525.jpg', 'center 21%'],
  ['/uploads/images/event-6735c3a8569a15f2087b968b-1793986201757.jpg', 'center 43%'],
  ['/uploads/images/event-6735c3a8569a15f2087ba3c5-1793985658032.jpg', 'center 37%'],
  ['/uploads/images/event-6735c3a8569a15f2087ba402-1793985802049.jpg', 'center top'],
  ['/uploads/images/event-6735c3a8569a15f2087ba4ab-1793986519539.jpg', 'center 13%'],
  ['/uploads/images/event-6735c3a8569a15f2087ba62f-1793986253802.jpg', 'center 39%'],
  ['/uploads/images/event-6756caed58f79d003027801b-1793986681596.jpg', 'center 23%'],
  ['/uploads/images/event-6910b16646a4d000309ec8c4-1793986576066.jpg', 'center top'],
  ['/uploads/images/event-6941aa8d46a4d000309eca64-1793986443394.jpg', 'center top'],
  ['/uploads/images/event-6a084e2546a4d000309ecf5f-1793985800227.jpg', 'center top'],
  ['/uploads/images/event-6a147c1146a4d000309ecfd2-1793986063472.jpg', 'center top'],
  ['/uploads/images/event-6a38e68f46a4d000309ed012-1793986061178.jpg', 'center 25%'],
  ['/uploads/images/event-6aa10616e7a769003011e93a-1793986670060.jpg', 'center 28%'],
  ['/uploads/images/event-6aba0ac7e7a769003011e96d-1793986592706.jpg', 'center 24%'],
  ['/uploads/images/event-6abb7269e7a769003011e975-1793986721052.jpg', 'center top'],
  ['/uploads/images/event-6abb72a5e7a769003011e977-1793986494251.jpg', 'center 36%'],
  ['/uploads/images/event-6abb73d1e7a769003011e97d-1793986441197.jpg', 'center 9%'],
  ['/uploads/images/event-6ac5d9c8e7a769003011e995-1793986521927.jpg', 'center 10%'],
  ['/uploads/images/event-6ac733dbe7a769003011e9a5-1793986629761.jpg', 'center 11%'],
  ['/uploads/images/event-6ac8d53ee7a769003011e9b6-1793986293924.jpg', 'center top'],
  ['/uploads/images/event-6ad1e714e7a769003011e9c9-1793986390022.jpg', 'center 35%'],
  ['/uploads/images/event-6ad7ab139cdb910030e37c07-1793986580814.jpg', 'center top'],
  ['/uploads/images/event-6adaeed09cdb910030e37c0b-1793986672387.jpg', 'center top'],
  ['/uploads/images/event-6adf062b9cdb910030e37c0f-1793986536348.jpg', 'center 22%'],
  ['/uploads/images/event-6adf0a759cdb910030e37c18-1793986445536.jpg', 'center top'],
  ['/uploads/images/event-6ae0ae019cdb910030e37c1f-1793986568928.jpg', 'center top'],
  ['/uploads/images/event-6ae0d3019cdb910030e37c22-1793986466434.jpg', 'center 14%'],
  ['/uploads/images/event-6ae2051d9cdb910030e37c29-1793986624993.jpg', 'center top'],
  ['/uploads/images/event-6ae71fb6e1f2108a04799856-1793986578544.jpg', 'center 10%'],
  ['/uploads/images/event-6ae721a0e1f2108a047999e7-1793986373200.jpg', 'center 42%'],
  ['/uploads/images/event-6ae85e23953d3927283bbf12-1793986631962.jpg', 'center 26%'],
  ['/uploads/images/event-6ae86025953d3927283bbfde-1793986665606.jpg', 'center 26%'],
  ['/uploads/images/cg2a2567-1777473796909.jpg', 'center top'],
  ['/uploads/images/bolshoi-turandot.jpg', 'center top'],
  ['/posters/chaika-bolshoi.webp', 'center 23%'],
];

export function resolveHeroObjectPosition(src: string | null | undefined): string {
  const s = (src || '').toLowerCase();
  for (const [key, position] of HERO_FOCUS) {
    if (s.includes(key)) return position;
  }
  return 'center center';
}
