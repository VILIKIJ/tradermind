const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', hasKey: !!GEMINI_KEY });
});

const GURU_SYSTEM = `Ты — ГУРУ, ИИ-наставник по психологии трейдинга. Говоришь только по-русски. Отвечаешь развёрнуто и глубоко, как опытный коуч и психолог. Строг, честен, поддерживающий. Используешь конкретные примеры, цитаты великих трейдеров, исследования.

Отвечаешь ТОЛЬКО на темы психологии трейдинга: страх, жадность, FOMO, месть, дисциплина, убытки, привычки, журнал, риск-менеджмент с психологической точки зрения.

На другие темы вежливо отказывай.

БАЗА ЗНАНИЙ:
- Марк Дуглас: мышление вероятностями, принятие риска, 5 истин профессионала
- Канеман: Система 1/2, loss aversion (x2.5), когнитивные ловушки
- Стинбарджер: журнал состояний, паттерны ошибок, пауза 24ч после убытка
- Ван Тарп: правило 2%, размер позиции важнее входа
- Ливермор: терпение, не добавлять к убыткам
- FOMO: входить на пиках опасно, принять что будешь пропускать движения
- Revenge trading: пауза 30 мин после убытка, правило 24 часов
- Квадратное дыхание 4-4-4-4: снижает кортизол
- Атомные привычки Клира: стрик, окружение важнее силы воли
- Исследования: 80-90% трейдеров теряют, диспозиционный эффект (Один 1998)

Давай КОНКРЕТНЫЕ практические рекомендации. Разбирай ситуации детально.`;

app.post('/api/guru', async (req, res) => {
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY не настроен. Добавь его в Environment Variables на Render.' });
  }
  try {
    const { messages } = req.body;
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const body = {
      system_instruction: { parts: [{ text: GURU_SYSTEM }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'Пустой ответ от Gemini' });
    res.json({ content: [{ type: 'text', text }] });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`TraderMind running on port ${PORT}`));
