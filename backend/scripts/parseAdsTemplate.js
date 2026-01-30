import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse /ads.html template and extract structured data
const adsHtml = fs.readFileSync(path.join(__dirname, '../../src/ads.html'), 'utf8');

// Extract header section
const headerMatch = adsHtml.match(/<div class="header-section services-header">\s*<h1>(.*?)<\/h1>\s*<p>(.*?)<\/p>\s*<div class="btn-mode[^"]*">\s*<a[^>]*class="btn-small"[^>]*>(.*?)<\/a>\s*<a[^>]*class="btn-outline"[^>]*>(.*?)<\/a>/s);
const header = headerMatch ? {
  title: headerMatch[1].trim(),
  description: headerMatch[2].trim(),
  primaryButtonText: headerMatch[3]?.trim() || 'Заказать',
  secondaryButtonText: headerMatch[4]?.trim() || 'Рассчитать стоимость',
} : null;

// Extract description section
const descMatch = adsHtml.match(/<h3>Описание<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>/s);
const description = descMatch ? {
  title: 'Описание',
  text: descMatch[1].trim(),
} : null;

// Extract price section (tariffs)
const priceMatch = adsHtml.match(/<h3[^>]*>Прайс<\/h3>[\s\S]*?<div class="tabs">([\s\S]*?)<\/div>\s*<\/div>/);
const tariffs = [];
if (priceMatch) {
  const tariffMatches = priceMatch[1].matchAll(/<div class="accordion-tab">[\s\S]*?<h2>(.*?)<\/h2>[\s\S]*?<p class="gray-txt">(.*?)<\/p>[\s\S]*?<p class="price-txt">(.*?)<\/p>[\s\S]*?<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>[\s\S]*?<h3>(.*?)<\/h3>\s*<div[^>]*class="d-flex jcsb w-70">\s*<ul>([\s\S]*?)<\/ul>\s*<ul>([\s\S]*?)<\/ul>/g);
  for (const match of tariffMatches) {
    const featuresLeft = match[7]?.match(/<li>(.*?)<\/li>/g)?.map(l => l.replace(/<\/?li>/g, '').trim()) || [];
    const featuresRight = match[8]?.match(/<li>(.*?)<\/li>/g)?.map(l => l.replace(/<\/?li>/g, '').trim()) || [];
    tariffs.push({
      id: `tariff-${tariffs.length + 1}`,
      name: match[1]?.trim() || '',
      subtitle: match[2]?.trim() || '',
      price: match[3]?.trim() || '',
      description: match[5]?.trim() || '',
      featuresLeft,
      featuresRight,
    });
  }
}

// Extract work steps
const stepsMatch = adsHtml.match(/<h3>Этапы настройки и запуска рекламы<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>[\s\S]*?<div class="stages pt-30">([\s\S]*?)<\/div>/);
const steps = [];
if (stepsMatch) {
  const stepMatches = stepsMatch[2].matchAll(/<h3>(\d+) этап<\/h3>[\s\S]*?<p>(.*?)<\/p>/g);
  for (const match of stepMatches) {
    steps.push({
      number: match[1] || '',
      description: match[2]?.trim() || '',
    });
  }
}

// Extract stats
const statsMatch = adsHtml.match(/<h3>О рекламе в цифрах<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>[\s\S]*?<div class="about-us-body[^"]*">([\s\S]*?)<\/div>/);
const stats = [];
if (statsMatch) {
  const statMatches = statsMatch[2].matchAll(/<p>(.*?)<\/p>\s*<span>\/<\/span>\s*<h3>(.*?)<\/h3>/g);
  for (const match of statMatches) {
    stats.push({
      value: match[1]?.trim() || '',
      label: match[2]?.replace(/<br\s*\/?>/g, ' ').trim() || '',
    });
  }
}

// Extract team
const teamMatch = adsHtml.match(/<h3>Команда[^<]*<\/h3>\s*<p[^>]*class="pt-20">(.*?)<\/p>[\s\S]*?<div class="owl-carousel[^"]*">([\s\S]*?)<\/div>/);
const teamMembers = [];
if (teamMatch) {
  const memberMatches = teamMatch[2].matchAll(/<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<span>\s*(.*?)\s*<\/span>[\s\S]*?<p>(.*?)<\/p>/g);
  for (const match of memberMatches) {
    teamMembers.push({
      name: match[2]?.trim() || '',
      role: match[3]?.trim() || '',
      imageUrl: match[1]?.replace(/@img\//, '/legacy/img/') || '',
    });
  }
}

// Extract related services
const relatedMatch = adsHtml.match(/<h3>Другие услуги по продвижению<\/h3>[\s\S]*?<div class="d-flex[^"]*all-web-site-services[^"]*">([\s\S]*?)<\/div>/);
const relatedServices = [];
if (relatedMatch) {
  const serviceMatches = relatedMatch[1].matchAll(/<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<h3>(.*?)<\/h3>/g);
  for (const match of serviceMatches) {
    relatedServices.push({
      title: match[2]?.trim() || '',
      imageUrl: match[1]?.replace(/@img\//, '/legacy/img/') || '',
    });
  }
}

// Extract subscribe items
const subscribeMatch = adsHtml.match(/<div class="services-description mt-50">\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
const subscribeItems = [];
if (subscribeMatch) {
  const itemMatches = subscribeMatch[1].matchAll(/<img[^>]*src="([^"]*)"[^>]*class="big-icon"[^>]*>[\s\S]*?<h5>(.*?)<\/h5>\s*<p>(.*?)<\/p>\s*<a[^>]*class="[^"]*yellow[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g);
  for (const match of itemMatches) {
    subscribeItems.push({
      iconUrl: match[1]?.replace(/@img\//, '/legacy/img/') || '',
      title: match[2]?.trim() || '',
      description: match[3]?.trim() || '',
      linkText: match[5]?.trim() || 'Подробнее',
      linkUrl: match[4]?.trim() || '/',
    });
  }
}

const template = {
  header,
  description,
  priceSection: tariffs.length > 0 ? { title: 'Прайс', tariffs } : null,
  workSteps: steps.length > 0 ? {
    title: 'Этапы настройки и запуска рекламы',
    description: stepsMatch?.[1]?.trim() || '',
    steps,
  } : null,
  stats: stats.length > 0 ? {
    title: 'О рекламе в цифрах',
    description: statsMatch?.[1]?.trim() || '',
    items: stats,
  } : null,
  team: teamMembers.length > 0 ? {
    title: 'Команда, работающая над рекламой',
    description: teamMatch?.[1]?.trim() || '',
    members: teamMembers,
  } : null,
  relatedServices: relatedServices.length > 0 ? {
    title: 'Другие услуги по продвижению',
    services: relatedServices,
  } : null,
  subscribe: subscribeItems.length > 0 ? { items: subscribeItems } : null,
};

console.log(JSON.stringify(template, null, 2));



