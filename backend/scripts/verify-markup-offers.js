#!/usr/bin/env node
/**
 * Проверка наценки на офферах: node scripts/verify-markup-offers.js [repertoireId]
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPublicOffersForRepertoire } from '../services/getbiletOffersPublic.js';
import { getGetbiletMarkupRuleForRepertoire } from '../services/getbiletMarkupPublic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const repertoireId = process.argv[2]?.trim() || '6a05d17b46a4d000309ecf4e';

const rule = await getGetbiletMarkupRuleForRepertoire(repertoireId);
const { payload, markupRule } = await getPublicOffersForRepertoire(repertoireId, { forceRefresh: true });
const rows = Array.isArray(payload?.ResultData) ? payload.ResultData : [];
const sample = rows[0];
const price = Number(sample?.NominalPrice ?? 0);
const factor = rule?.markup_kind === 'percent' ? 1 + Number(rule.markup_value) / 100 : null;
const impliedSupplier = factor ? Math.round(price / factor) : price;

console.log(
  JSON.stringify(
    {
      repertoireId,
      rule: markupRule,
      offers: rows.length,
      sample: sample
        ? { sector: sample.Sector, row: sample.Row, price, impliedSupplier }
        : null,
      ok: Boolean(markupRule && rows.length > 0),
    },
    null,
    2,
  ),
);

process.exit(markupRule && rows.length > 0 ? 0 : 1);
