/**
 * Cold Lead Sales Pipeline — аналог n8n workflow внутри платформы.
 * Импорт лидов, ежедневная обработка (аудит сайта, отправка), разбор ответов клиентов.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { requireAuth, requireAdminOrSalesManager } from '../middleware/auth.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
  fetchWebsiteHtml,
  extractWebsiteData,
  runWebsiteAudit,
  extractPhoneFromHtml,
  normalizePhone,
  getEmailTemplate,
  sendUniSenderTelegram,
  sendUniSenderEmail,
  sendUniSenderEmailByTemplate,
  analyzeClientResponse,
  analyzeClientResponseWithProposal,
  isCorporateEmail,
  deriveWebsiteFromEmail,
  pickPrimaryEmail,
} from '../services/salesPipelineService.js';

const UNSUBSCRIBE_URL_DEFAULT = 'https://prime-coder.ru/#contacts';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function getBatchSize() {
  const n = parseInt(process.env.SALES_PIPELINE_BATCH_SIZE, 10);
  return Number.isFinite(n) && n >= 1 && n <= 200 ? n : 10;
}
function getMaxEmailsPerRun() {
  const n = parseInt(process.env.SALES_PIPELINE_MAX_EMAILS_PER_RUN, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function getEmailTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

// ————— Список лидов (из таблицы clients с pipeline_stage) —————
router.get('/leads', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, stage, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['pipeline_stage IS NOT NULL'];
    const params = [];
    let idx = 1;

    if (req.user?.role === 'sales_manager') {
      conditions.push(`(assigned_to = $${idx} OR assigned_to IS NULL)`);
      params.push(req.user.id);
      idx++;
    }
    if (stage) {
      conditions.push(`pipeline_stage = $${idx}`);
      params.push(stage);
      idx++;
    }
    if (search) {
      conditions.push(`(company ILIKE $${idx} OR name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM clients ${where}`,
      params
    );
    const listRes = await pool.query(
      `SELECT id, name, company, email, phone, source, status, website, pipeline_stage AS stage,
              audit_score, business_potential, last_outreach_at, last_reply_at, created_at, updated_at
       FROM clients ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      total: parseInt(countRes.rows[0].count, 10),
      page: parseInt(page),
      limit: parseInt(limit),
      items: listRes.rows,
    });
  } catch (e) {
    console.error('[salesPipeline] GET /leads', e);
    const msg = e.message || 'Ошибка загрузки лидов';
    const hint = msg.includes('pipeline_stage') || msg.includes('column') ? ' Выполните на сервере: node scripts/apply-migrations-to-db.js' : '';
    res.status(500).json({ error: msg + hint });
  }
});

// ————— Импорт лидов (CSV: поддерживает формат Google Sheets "холодная база" и др.) —————
// Колонки: ФИО/name, tel/phone, email, company_name/company, website (опц.), notes (игнор)
router.post('/leads/import', requireAuth, requireAdminOrSalesManager, upload.single('file'), async (req, res) => {
  try {
    const rows = [];
    if (req.file && req.file.buffer) {
      let raw = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
      await new Promise((resolve, reject) => {
        const stream = Readable.from([raw]);
        stream
          .pipe(csv({ separator: [',', ';'].includes(req.body?.separator) ? req.body.separator : ',', skipLines: 0 }))
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (Array.isArray(req.body?.leads)) {
      req.body.leads.forEach((l) => {
        if (l.email) rows.push({
          name: l.name || l.ФИО,
          phone: l.phone || l.tel,
          company_name: l.company_name || l.company,
          website: l.website || '',
          email: l.email,
        });
      });
    } else {
      return res.status(400).json({ error: 'Нужен file (CSV) или body.leads (массив с полями name, email, company_name, phone?, website?)' });
    }

    const cleanRow = (r) => {
      const o = {};
      for (const k of Object.keys(r)) o[k.replace(/^\uFEFF/, '').trim()] = r[k];
      return o;
    };
    const getVal = (r, ...keys) => {
      const v = keys.find((k) => r[k] != null && String(r[k]).trim() !== '');
      return v != null ? String(r[v]).trim() : '';
    };
    const normalize = (r) => {
      r = cleanRow(r);
      const name = getVal(r, 'ФИО', 'name', 'company_name', 'company') || getVal(r, 'company', 'company_name');
      const company = getVal(r, 'company_name', 'company', 'ФИО', 'name') || name;
      const emailRaw = getVal(r, 'email') || '';
      const email = pickPrimaryEmail(emailRaw) || (emailRaw.includes(',') ? emailRaw.split(',')[0].trim() : emailRaw);
      const phone = getVal(r, 'tel', 'phone');
      let website = getVal(r, 'website');
      if (!website && email && isCorporateEmail(email)) website = deriveWebsiteFromEmail(email);
      return { name: name || company, company: company || name, email, phone, website };
    };

    const toInsert = rows
      .map(normalize)
      .filter((r) => r.email && (r.name || r.company));

    if (toInsert.length === 0) {
      return res.json({ imported: 0, message: 'Нет строк с email и именем/компанией' });
    }

    let imported = 0;
    for (const row of toInsert) {
      const exists = await pool.query(
        'SELECT id FROM clients WHERE LOWER(email) = LOWER($1)',
        [row.email]
      );
      if (exists.rows.length > 0) {
        const c = exists.rows[0];
        await pool.query(
          `UPDATE clients SET pipeline_stage = 'new', website = COALESCE(NULLIF(TRIM($1), ''), website), company = COALESCE(NULLIF(TRIM($2), ''), company), name = COALESCE(NULLIF(TRIM($3), ''), name), phone = COALESCE(NULLIF(TRIM($4), ''), phone), updated_at = NOW() WHERE id = $5`,
          [row.website || null, row.company, row.name, row.phone || null, c.id]
        );
        imported++;
        continue;
      }
      // Минимальный набор колонок: на проде могут отсутствовать assigned_to/created_by (миграции под другим владельцем)
      await pool.query(
        `INSERT INTO clients (name, company, email, phone, website, source, status, pipeline_stage)
         VALUES ($1, $2, $3, $4, $5, 'import', 'lead', 'new')`,
        [row.name, row.company, row.email, row.phone || null, row.website || null]
      );
      imported++;
    }

    res.json({ imported, total: toInsert.length });
  } catch (e) {
    console.error('[salesPipeline] POST /leads/import', e);
    const msg = e.message || String(e) || 'Ошибка импорта';
    const hint = msg.includes('pipeline_stage') || msg.includes('column') ? ' Выполните миграцию 064 под postgres: sudo -u postgres psql -d primecoder_prod -f backend/migrations/064_sales_pipeline_from_clients.sql' : '';
    res.status(500).json({ error: msg + hint, code: e.code });
  }
});

// ————— Ежедневная обработка (cron): new → audit → send —————
// Для теста только на 2 ящика: ?secret=...&only_emails=info@prime-coder.ru,vladleo2020@gmail.com (остальные 993 не трогаем)
router.get('/process-daily', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.query.secret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const onlyEmailsRaw = req.query.only_emails;
  const onlyEmails = onlyEmailsRaw
    ? onlyEmailsRaw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : null;

  try {
    const batchSize = onlyEmails ? onlyEmails.length : getBatchSize();
    const maxEmails = getMaxEmailsPerRun();
    let leadsRes;
    if (onlyEmails && onlyEmails.length > 0) {
      // Только указанные email (тест без затрагивания остальной базы)
      leadsRes = await pool.query(
        `SELECT id, name, company, website, email FROM clients WHERE LOWER(TRIM(email)) = ANY($1::text[]) AND pipeline_stage = 'new' ORDER BY created_at ASC`,
        [onlyEmails]
      );
    } else {
      leadsRes = await pool.query(
        `SELECT id, name, company, website, email FROM clients WHERE pipeline_stage = 'new' ORDER BY created_at ASC LIMIT $1`,
        [batchSize]
      );
    }
    let leads = leadsRes.rows;
    if (maxEmails != null && leads.length > maxEmails) leads = leads.slice(0, maxEmails);
    if (onlyEmails?.length && leads.length === 0) {
      return res.json({
        processed: 0,
        sent: 0,
        only_emails_used: true,
        leads_count: 0,
        message: 'По указанным only_emails в базе нет лидов с pipeline_stage = \'new\'. Добавьте этих контактов в clients со stage = new.',
        requested_emails: onlyEmails,
        env_check: {
          UNISENDER_API_KEY: !!process.env.UNISENDER_API_KEY,
          SENDER_EMAIL: !!process.env.SENDER_EMAIL,
          SENDER_NAME: !!process.env.SENDER_NAME,
        },
      });
    }
    const results = {
      processed: 0,
      sent: 0,
      errors: [],
      sendErrors: [],
      only_emails_used: !!onlyEmails?.length,
      leads_count: leads.length,
      batchSize,
      maxEmailsPerRun: maxEmails,
    };

    const unsubscribeUrl = process.env.UNSUBSCRIBE_URL || UNSUBSCRIBE_URL_DEFAULT;
    for (const lead of leads) {
      try {
        let website = lead.website || '';
        if (!website && lead.email && isCorporateEmail(lead.email)) {
          website = deriveWebsiteFromEmail(lead.email);
          if (website) {
            await pool.query(`UPDATE clients SET website = $1, updated_at = NOW() WHERE id = $2`, [website, lead.id]);
          }
        }
        const companyName = lead.company || lead.name || 'Компания';
        if (!website || !website.startsWith('http')) {
          const basicTemplate = getEmailTemplate('basic', { company_name: companyName, website: '', email: lead.email }, {});
          const basicVars = { company_name: companyName, unsubscribe_url: unsubscribeUrl };
          let sent = false;
          const emailResult = await sendUniSenderEmailByTemplate(
            lead.email,
            'basic',
            process.env.SENDER_NAME,
            process.env.SENDER_EMAIL,
            basicVars
          );
          if (emailResult.ok) sent = true;
          else {
            results.sendErrors.push({ email: lead.email, channel: 'email', reason: emailResult.reason || 'unknown' });
            const trans = getEmailTransporter();
            if (trans) {
              try {
                await trans.sendMail({
                  from: process.env.EMAIL_USER,
                  to: lead.email,
                  subject: basicTemplate.subject,
                  text: basicTemplate.body,
                });
                sent = true;
              } catch (smtpErr) {
                results.sendErrors.push({ email: lead.email, channel: 'smtp_fallback', reason: smtpErr.message });
              }
            }
          }
          if (sent) {
            results.sent++;
            await pool.query(
              `INSERT INTO client_outreach_log (client_id, email_template, channel, status) VALUES ($1, $2, 'email', 'sent')`,
              [lead.id, basicTemplate.templateId]
            );
            await pool.query(
              `UPDATE clients SET pipeline_stage = 'email_sent', last_outreach_at = NOW(), audit_summary = $1, updated_at = NOW() WHERE id = $2`,
              [JSON.stringify({ note: 'без аудита (личная почта)' }), lead.id]
            );
          } else {
            await pool.query(
              `UPDATE clients SET pipeline_stage = 'audited', audit_summary = $1, updated_at = NOW() WHERE id = $2`,
              [JSON.stringify({ error: 'no_website', send_failed: true }), lead.id]
            );
          }
          results.processed++;
          continue;
        }

        const html = await fetchWebsiteHtml(website);
        const websiteData = extractWebsiteData(html || '');
        const audit = await runWebsiteAudit(companyName, website, websiteData);
        if (!audit) {
          results.errors.push({ clientId: lead.id, step: 'audit' });
          continue;
        }

        let phone = await extractPhoneFromHtml(html || '');
        const phoneNormalized = normalizePhone(phone);
        const phoneFound = phoneNormalized.length === 12; // +7...

        await pool.query(
          `UPDATE clients SET
           audit_score = $1, business_potential = $2, audit_summary = $3, pipeline_stage = 'audited',
           phone = COALESCE(phone, $4), updated_at = NOW()
           WHERE id = $5`,
          [
            audit.audit_score,
            audit.business_potential,
            JSON.stringify(audit),
            phoneFound ? phoneNormalized : null,
            lead.id,
          ]
        );

        const template = getEmailTemplate(audit.business_potential, { company_name: companyName, website, email: lead.email }, audit);
        const templateVars = {
          company_name: companyName,
          website,
          audit_score: audit.audit_score,
          audit_summary: audit.recommended_approach || audit.personalized_intro || '',
          personalized_intro: audit.personalized_intro || '',
          unsubscribe_url: unsubscribeUrl,
        };
        let sent = false;
        if (phoneFound && process.env.UNISENDER_API_KEY && process.env.UNISENDER_CHANNEL_ID) {
          const tg = await sendUniSenderTelegram(phoneNormalized, template.body);
          sent = tg.ok;
          if (!sent) results.sendErrors.push({ email: lead.email, channel: 'telegram', reason: tg.reason || 'unknown' });
        }
        if (!sent) {
          const emailResult = await sendUniSenderEmailByTemplate(
            lead.email,
            audit.business_potential,
            process.env.SENDER_NAME,
            process.env.SENDER_EMAIL,
            templateVars
          );
          if (emailResult.ok) {
            sent = true;
          } else {
            results.sendErrors.push({ email: lead.email, channel: 'email', reason: emailResult.reason || 'unknown' });
            const trans = getEmailTransporter();
            if (trans) {
              try {
                await trans.sendMail({
                  from: process.env.EMAIL_USER,
                  to: lead.email,
                  subject: template.subject,
                  text: template.body,
                });
                sent = true;
              } catch (smtpErr) {
                results.sendErrors.push({ email: lead.email, channel: 'smtp_fallback', reason: smtpErr.message });
              }
            }
          }
        }

        if (sent) {
          results.sent++;
          await pool.query(
            `INSERT INTO client_outreach_log (client_id, email_template, channel, status) VALUES ($1, $2, $3, 'sent')`,
            [lead.id, template.templateId, phoneFound && process.env.UNISENDER_CHANNEL_ID ? 'telegram' : 'email']
          );
          await pool.query(
            `UPDATE clients SET pipeline_stage = 'email_sent', last_outreach_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [lead.id]
          );
        }
        results.processed++;
      } catch (err) {
        console.error('[salesPipeline] process-daily client', lead.id, err);
        results.errors.push({ clientId: lead.id, message: err.message });
      }
    }

    if (onlyEmails?.length) {
      results.env_check = {
        UNISENDER_API_KEY: !!process.env.UNISENDER_API_KEY,
        SENDER_EMAIL: !!process.env.SENDER_EMAIL,
        SENDER_NAME: !!process.env.SENDER_NAME,
      };
    }
    res.json(results);
  } catch (e) {
    console.error('[salesPipeline] process-daily', e);
    res.status(500).json({ error: 'Ошибка ежедневной обработки', details: e.message });
  }
});

// ————— Тестовая отправка HTML-писем на два ящика (для проверки шаблонов) —————
const TEST_EMAILS = ['info@prime-coder.ru', 'vladleo2020@gmail.com'];

function loadAndFillHtmlTemplate(templateName, vars = {}) {
  const templatesDir = path.join(__dirname, '../email-templates/sales');
  const filePath = path.join(templatesDir, `${templateName}.html`);
  if (!fs.existsSync(filePath)) return null;
  let html = fs.readFileSync(filePath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\[%${key}%\\]`, 'g'), value ?? '');
  }
  return html;
}

router.get('/test-send', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.query.secret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const senderName = process.env.SENDER_NAME || 'Prime Coder';
    const senderEmail = process.env.SENDER_EMAIL;
    if (!senderEmail) {
      return res.status(500).json({ error: 'Не задан SENDER_EMAIL в .env' });
    }
    const vars = {
      company_name: 'Тест',
      unsubscribe_url: process.env.UNSUBSCRIBE_URL || UNSUBSCRIBE_URL_DEFAULT,
    };
    const sent = [];
    const errors = [];
    for (const to of TEST_EMAILS) {
      const result = await sendUniSenderEmailByTemplate(to, 'basic', senderName, senderEmail, vars);
      if (result.ok) sent.push(to);
      else errors.push({ email: to, reason: result.reason });
    }
    res.json({ sent, errors, message: `Отправлено: ${sent.length} из ${TEST_EMAILS.length}` });
  } catch (e) {
    console.error('[salesPipeline] test-send', e);
    res.status(500).json({ error: e.message });
  }
});

// ————— Обработка ответа клиента (ручной вызов или webhook) —————
router.post('/process-reply', requireAuth, requireAdminOrSalesManager, async (req, res) => {
  try {
    const { fromEmail, subject, text } = req.body;
    const email = (fromEmail || req.body.email || '').trim();
    const messageText = (text || req.body.text || req.body.message_body || '').trim();
    if (!email || !messageText) {
      return res.status(400).json({ error: 'Нужны fromEmail и text (или email и message_body)' });
    }

    const clientRes = await pool.query(
      'SELECT id, company, name, email, audit_summary FROM clients WHERE LOWER(email) = LOWER($1) AND pipeline_stage IS NOT NULL LIMIT 1',
      [email]
    );
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент с таким email не найден в пайплайне' });
    }
    const client = clientRes.rows[0];

    await pool.query(
      `INSERT INTO client_correspondence (client_id, correspondence_type, client_email, subject, message_body) VALUES ($1, 'incoming', $2, $3, $4)`,
      [client.id, email, subject || '', messageText]
    );

    // Контекст для менеджера переписки: услуги с ценами из products (чтобы не ошибаться в стоимости)
    let servicesForContext = [];
    try {
      const productsRes = await pool.query(
        `SELECT title, price_cents FROM products WHERE price_cents IS NOT NULL AND price_cents > 0 ORDER BY title ASC LIMIT 20`
      );
      servicesForContext = productsRes.rows.map((p) => ({
        title: p.title || '',
        priceFormatted: p.price_cents != null ? `${Math.round(Number(p.price_cents) / 100).toLocaleString('ru-RU')} ₽` : 'по запросу',
      }));
    } catch (_) {
      // products может отсутствовать или другая схема
    }

    const context = {
      clientName: client.name || '',
      company: client.company || '',
      auditSummary: client.audit_summary && typeof client.audit_summary === 'object' ? client.audit_summary : {},
      services: servicesForContext,
    };
    let analysis = await analyzeClientResponseWithProposal(context, messageText);
    if (!analysis) {
      analysis = await analyzeClientResponse(messageText);
      if (!analysis) return res.status(500).json({ error: 'Не удалось проанализировать ответ (OpenAI)' });
      analysis.proposal_draft = analysis.suggested_response || '';
      analysis.suggested_services = [];
      analysis.upsell_note = '';
      analysis.intent = analysis.next_action === 'ready_to_meet' ? 'wants_meeting' : analysis.next_action === 'no_interest' ? 'no_interest' : 'interested';
    }

    let newStage = 'replied';
    if (analysis.next_action === 'ready_to_meet') newStage = 'qualified';
    else if (analysis.next_action === 'no_interest') newStage = 'lost';

    await pool.query(
      `UPDATE clients SET pipeline_stage = $1, last_reply_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [newStage, client.id]
    );

    let meetingId = null;
    if (analysis.next_action === 'ready_to_meet' || analysis.meeting_ready) {
      const meetingRes = await pool.query(
        `INSERT INTO client_meetings (client_id, meeting_status) VALUES ($1, 'scheduled') RETURNING id`,
        [client.id]
      );
      meetingId = meetingRes.rows[0]?.id;
      await pool.query(
        `UPDATE clients SET pipeline_stage = 'meeting_scheduled' WHERE id = $1`,
        [client.id]
      );
      const notifyTo = process.env.NOTIFICATION_EMAIL || process.env.SENDER_EMAIL;
      if (notifyTo) {
        const trans = getEmailTransporter();
        if (trans) {
          const clientName = client.name || client.company || client.email;
          const proposalBlock = analysis.proposal_draft ? `\n\nЧерновик ответа (отправить с info@ или в Telegram):\n---\n${analysis.proposal_draft}\n---` : '';
          await trans.sendMail({
            from: process.env.EMAIL_USER || process.env.SENDER_EMAIL,
            to: notifyTo,
            subject: `[Пайплайн] Клиент просит встречу: ${clientName}`,
            text: `Клиент в пайплайне попросил записать на встречу.\n\nКлиент: ${clientName}\nEmail: ${client.email}\nКомпания: ${client.company || '—'}\n\nОтвет клиента:\n${messageText}\n\nРекомендация: ${analysis.suggested_response || '—'}${proposalBlock}\n\nСоздана запись о встрече (client_meetings). Запланируйте встречу в календаре и при необходимости добавьте zoom_link в карточку клиента.`,
          }).catch((err) => console.error('[salesPipeline] notification email failed', err));
        }
      }
    }

    res.json({
      clientId: client.id,
      stage: newStage,
      meetingId,
      analysis: {
        is_qualified: analysis.is_qualified,
        interest_level: analysis.interest_level,
        meeting_ready: analysis.meeting_ready,
        suggested_response: analysis.suggested_response,
        next_action: analysis.next_action,
        intent: analysis.intent,
        proposal_draft: analysis.proposal_draft,
        suggested_services: analysis.suggested_services,
        upsell_note: analysis.upsell_note,
      },
    });
  } catch (e) {
    console.error('[salesPipeline] process-reply', e);
    res.status(500).json({ error: 'Ошибка обработки ответа', details: e.message });
  }
});

// ————— Один лид (клиент) по id (для UI) —————
router.get('/leads/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      'SELECT id, name, company, email, phone, source, status, website, pipeline_stage AS stage, audit_score, business_potential, audit_summary, last_outreach_at, last_reply_at, assigned_to, created_at, updated_at FROM clients WHERE id = $1 AND pipeline_stage IS NOT NULL',
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Лид не найден' });
    if (req.user?.role === 'sales_manager' && r.rows[0].assigned_to !== req.user.id && r.rows[0].assigned_to != null) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    res.json(r.rows[0]);
  } catch (e) {
    console.error('[salesPipeline] GET /leads/:id', e);
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
