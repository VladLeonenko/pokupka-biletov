import pool from '../db.js';

async function addTemplateFields() {
  try {
    // Check if columns exist
    const checkCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='cases' 
      AND column_name IN ('template_type', 'is_template')
    `);
    
    const existingCols = checkCols.rows.map(r => r.column_name);
    
    if (!existingCols.includes('template_type')) {
      await pool.query('ALTER TABLE cases ADD COLUMN template_type VARCHAR(50) DEFAULT NULL');
      console.log('✓ Added template_type column');
    } else {
      console.log('✓ template_type column already exists');
    }
    
    if (!existingCols.includes('is_template')) {
      await pool.query('ALTER TABLE cases ADD COLUMN is_template BOOLEAN DEFAULT FALSE');
      console.log('✓ Added is_template column');
    } else {
      console.log('✓ is_template column already exists');
    }
    
    // Check indexes
    const checkIndexes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename='cases' 
      AND indexname IN ('idx_cases_template_type', 'idx_cases_is_template')
    `);
    
    const existingIndexes = checkIndexes.rows.map(r => r.indexname);
    
    if (!existingIndexes.includes('idx_cases_template_type')) {
      await pool.query('CREATE INDEX idx_cases_template_type ON cases(template_type)');
      console.log('✓ Created idx_cases_template_type index');
    }
    
    if (!existingIndexes.includes('idx_cases_is_template')) {
      await pool.query('CREATE INDEX idx_cases_is_template ON cases(is_template)');
      console.log('✓ Created idx_cases_is_template index');
    }
    
    console.log('\nTemplate fields migration completed!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addTemplateFields();



