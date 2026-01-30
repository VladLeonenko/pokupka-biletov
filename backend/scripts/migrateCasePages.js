import pool from '../db.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../../src');

// Function to extract body content and remove includes
function extractBodyContent(html) {
  // Remove @@include directives
  let content = html.replace(/@@include\([^)]+\)/g, '');
  
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) return html;
  
  content = bodyMatch[1];
  
  // Remove scripts at the end
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  return content.trim();
}

// Function to extract hero image from HTML
function extractHeroImage(html, caseSlug) {
  // Try different patterns based on case type
  const patterns = [
    /<img[^>]+class="[^"]*banner[^"]*"[^>]+src="([^"]+)"/i,
    /<img[^>]+src="@img\/([^"]+)"[^>]*alt="[^"]*Кейс/i,
    /<img[^>]+src="@img\/([^"]+case[^"]+)"/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const imgPath = match[1].replace('@img/', '');
      return `/uploads/images/${imgPath}`;
    }
  }
  
  // Default based on case slug
  const defaultImages = {
    'madeo-case': '/uploads/images/madeo-case-banner.png',
    'straumann-case': '/uploads/images/straumann-banner.png',
    'houses-case': '/uploads/images/tablet-houses-case.png',
  };
  
  return defaultImages[caseSlug] || null;
}

// Function to extract tools from HTML
function extractTools(html) {
  const tools = [];
  const toolsSection = html.match(/<section[^>]*class="[^"]*tools[^"]*"[\s\S]*?<\/section>/i);
  
  if (toolsSection) {
    // Look for common tools
    const toolsText = toolsSection[0].toLowerCase();
    const toolKeywords = {
      'wordpress': 'WordPress',
      'html': 'HTML',
      'css': 'CSS',
      'javascript': 'JavaScript',
      'js': 'JavaScript',
      'php': 'PHP',
      'mysql': 'MySQL',
      'figma': 'Figma',
      'photoshop': 'Adobe Photoshop',
      'illustrator': 'Adobe Illustrator',
      'after effects': 'Adobe After Effects',
    };
    
    for (const [keyword, tool] of Object.entries(toolKeywords)) {
      if (toolsText.includes(keyword) && !tools.includes(tool)) {
        tools.push(tool);
      }
    }
  }
  
  return tools.length > 0 ? tools : ['WordPress', 'HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL'];
}

// Function to extract metrics/stats from HTML
function extractMetrics(html) {
  const metrics = {};
  
  // Try to find statistics section
  const statsSection = html.match(/<section[^>]*class="[^"]*stat[^"]*"[\s\S]*?<\/section>/i);
  if (statsSection) {
    // Extract performance metrics
    const perfPattern = /<h5>([^<]+)<\/h5>\s*<p>([^<]+)<\/p>/g;
    let match;
    const perfMetrics = [];
    
    while ((match = perfPattern.exec(statsSection[0])) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value) {
        perfMetrics.push({ name: key, value });
      }
    }
    
    if (perfMetrics.length > 0) {
      metrics.performance = perfMetrics;
    }
    
    // Extract results metrics (days, pages, etc.)
    const resultPattern = /<h2[^>]*>(\d+)[\s\S]*?<\/h2>\s*<p[^>]*>([^<]+)<\/p>/g;
    const resultMetrics = [];
    
    while ((match = resultPattern.exec(statsSection[0])) !== null) {
      const value = match[1].trim();
      const label = match[2].trim();
      if (value && label) {
        resultMetrics.push({ value, label });
      }
    }
    
    if (resultMetrics.length > 0) {
      metrics.results = resultMetrics;
    }
  }
  
  return metrics;
}

// Function to extract gallery images
function extractGallery(html) {
  const gallery = [];
  const imgPattern = /<img[^>]+src="@img\/([^"]+)"[^>]*alt="([^"]*)"/gi;
  let match;
  
  while ((match = imgPattern.exec(html)) !== null) {
    const imgPath = match[1];
    const alt = match[2];
    
    // Skip common UI images and icons
    if (!imgPath.match(/(photoshop|wordpress|figma|javascript|illustrator|emo|leonenko|pavel|svetlana|sergey|anna|ilshat)\.(png|jpg|jpeg|svg)/i)) {
      gallery.push({
        url: `/uploads/images/${imgPath}`,
        alt: alt || 'Gallery image',
      });
    }
  }
  
  return gallery.slice(0, 20); // Limit to 20 images
}

// Function to extract title from HTML
function extractTitle(html) {
  // Try to get from title in head
  const titleMatch = html.match(/@@include\([^)]+head[^)]+title["']:\s*["']([^"']+)["']/i);
  if (titleMatch) {
    return titleMatch[1];
  }
  
  // Try to get from h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  return null;
}

// Function to extract summary/description
function extractSummary(html) {
  // Try to get from meta description
  const descMatch = html.match(/description["']:\s*["']([^"']+)["']/i);
  if (descMatch) {
    return descMatch[1];
  }
  
  // Try to get from "О проекте" section
  const aboutMatch = html.match(/<h1[^>]*>О проекте<\/h1>[\s\S]*?<p[^>]*>([^<]+)<\/p>/i);
  if (aboutMatch) {
    return aboutMatch[1].trim();
  }
  
  return null;
}

async function migrateCasePage(caseSlug) {
  const htmlFile = path.join(SRC_DIR, `${caseSlug}.html`);
  
  try {
    const html = await fs.readFile(htmlFile, 'utf8');
    
    const bodyContent = extractBodyContent(html);
    const title = extractTitle(html) || caseSlug.replace('-case', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const summary = extractSummary(html);
    const heroImage = extractHeroImage(html, caseSlug);
    const tools = extractTools(html);
    const metrics = extractMetrics(html);
    const gallery = extractGallery(html);
    
    // Determine template type based on structure
    let templateType = 'madeo'; // default
    if (caseSlug === 'straumann-case') {
      templateType = 'straumann';
    } else if (caseSlug === 'houses-case') {
      templateType = 'houses';
    }
    
    // Check if case already exists
    const existing = await pool.query('SELECT id FROM cases WHERE slug = $1', [caseSlug]);
    
    if (existing.rows.length > 0) {
      // Update existing case
      await pool.query(
        `UPDATE cases 
         SET title = $2, summary = $3, content_html = $4, hero_image_url = $5, 
             gallery = $6, metrics = $7, tools = $8, template_type = $9, is_template = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE slug = $1`,
        [caseSlug, title, summary, bodyContent, heroImage, JSON.stringify(gallery), 
         JSON.stringify(metrics), tools, templateType, true]
      );
      console.log(`✓ Updated case: ${caseSlug}`);
    } else {
      // Insert new case
      await pool.query(
        `INSERT INTO cases (slug, title, summary, content_html, hero_image_url, gallery, metrics, tools, template_type, is_template, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [caseSlug, title, summary, bodyContent, heroImage, JSON.stringify(gallery), 
         JSON.stringify(metrics), tools, templateType, true, true]
      );
      console.log(`✓ Created case: ${caseSlug}`);
    }
    
    // Remove from pages table if exists
    const pageExists = await pool.query('SELECT id FROM pages WHERE slug = $1', [caseSlug]);
    if (pageExists.rows.length > 0) {
      await pool.query('DELETE FROM pages WHERE slug = $1', [caseSlug]);
      console.log(`  Removed from pages: ${caseSlug}`);
    }
    
  } catch (err) {
    console.error(`Error migrating ${caseSlug}:`, err.message);
  }
}

async function main() {
  const caseSlugs = ['madeo-case', 'straumann-case', 'houses-case'];
  
  console.log('Starting migration of case pages...\n');
  
  for (const slug of caseSlugs) {
    await migrateCasePage(slug);
  }
  
  console.log('\nMigration completed!');
  await pool.end();
}

main().catch(console.error);



