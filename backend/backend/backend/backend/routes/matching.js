const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  try {
    const { skills, district } = req.body;

    // Берём вакансии из БД
    const jobsResult = await pool.query('SELECT * FROM jobs WHERE is_active = true');
    const jobs = jobsResult.rows;

    // Отправляем в Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Ты AI ассистент платформы занятости Mangystau Jobs в Актау.

Навыки соискателя: ${skills.join(', ')}
Район: ${district || 'любой'}

Вакансии:
${jobs.map(j => `ID:${j.id} | ${j.title} | ${j.company} | ${j.district} | ${j.description}`).join('\n')}

Найди топ-3 подходящие вакансии. Верни ТОЛЬКО JSON без лишнего текста:
[{"id":1,"score":95,"reason":"Объяснение на русском"}]`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const matches = JSON.parse(clean);

    // Сохраняем в БД
    for (const match of matches) {
      await pool.query(
        'INSERT INTO matches (job_id, score, reason) VALUES ($1, $2, $3)',
        [match.id, match.score, match.reason]
      );
    }

    res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка AI матчинга' });
  }
});

module.exports = router;
