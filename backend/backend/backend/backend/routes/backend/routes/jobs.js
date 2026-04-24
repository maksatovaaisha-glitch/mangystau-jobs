const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все вакансии
router.get('/', async (req, res) => {
  try {
    const { category, district, type, exp, search } = req.query;
    let query = 'SELECT * FROM jobs WHERE is_active = true';
    let params = [];
    let i = 1;

    if (category) { query += ` AND category = $${i++}`; params.push(category); }
    if (district) { query += ` AND district = $${i++}`; params.push(district); }
    if (type) { query += ` AND job_type = $${i++}`; params.push(type); }
    if (exp) { query += ` AND experience = $${i++}`; params.push(exp); }
    if (search) { query += ` AND (title ILIKE $${i} OR description ILIKE $${i++})`; params.push(`%${search}%`); }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать вакансию
router.post('/', async (req, res) => {
  try {
    const { title, company, description, category, district, job_type, experience, salary, contact } = req.body;
    const result = await pool.query(
      `INSERT INTO jobs (title, company, description, category, district, job_type, experience, salary, contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, company, description, category, district, job_type, experience, salary, contact]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
