import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  competitorSourceFromUrl,
  extractPublicTicketMinPrice,
  parseCompetitorUrlList,
  parseRubAmount,
} from '../utils/extractPublicTicketPrice.js';

describe('extractPublicTicketPrice', () => {
  it('parseRubAmount understands spaced thousands', () => {
    assert.equal(parseRubAmount('4 000'), 4000);
    assert.equal(parseRubAmount('3900.00'), 3900);
    assert.equal(parseRubAmount(12), null);
  });

  it('detects yandex / portbilet hosts', () => {
    assert.equal(
      competitorSourceFromUrl('https://afisha.yandex.ru/moscow/theatre_show/x'),
      'yandex_afisha',
    );
    assert.equal(competitorSourceFromUrl('https://www.portbilet.ru/app/ru/x'), 'portbilet');
    assert.equal(competitorSourceFromUrl('https://www.afisha.ru/performance/1/'), 'afisha_ru');
  });

  it('reads Yandex Afisha JSON-LD AggregateOffer.lowPrice', () => {
    const html = `<html><script type="application/ld+json">${JSON.stringify({
      '@type': 'TheaterEvent',
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '3900.00',
        highPrice: '30000.00',
        priceCurrency: 'RUB',
      },
    })}</script></html>`;
    const out = extractPublicTicketMinPrice(html, 'https://afisha.yandex.ru/moscow/theatre_show/x');
    assert.equal(out.minPriceRub, 3900);
    assert.equal(out.maxPriceRub, 30000);
    assert.equal(out.method, 'jsonld:lowPrice');
  });

  it('reads «от N ₽» from listing markup', () => {
    const html = '<span class="ticketsPrice.price">от 4 000 ₽</span>';
    const out = extractPublicTicketMinPrice(html);
    assert.equal(out.minPriceRub, 4000);
    assert.equal(out.method, 'text:ot');
  });

  it('parseCompetitorUrlList dedupes and skips junk', () => {
    const rows = parseCompetitorUrlList(
      'https://afisha.yandex.ru/moscow/a\nnot-a-url\nhttps://afisha.yandex.ru/moscow/a\nhttps://www.portbilet.ru/x',
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].source, 'yandex_afisha');
    assert.equal(rows[1].source, 'portbilet');
  });
});
