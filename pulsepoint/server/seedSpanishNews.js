const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

const dummyArticles = [
  {
    title: 'El gobierno anuncia nuevas medidas económicas para 2026',
    description: 'Las nuevas políticas buscan reducir la inflación y fomentar el empleo en los sectores tecnológicos.',
    content: 'Contenido completo del artículo sobre economía...',
    url: 'https://example.com/es-economia-2026',
    urlToImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    publishedAt: new Date(),
    source: { id: null, name: 'Diario Español' },
    category: 'Business',
    language: 'es',
    country: 'global',
    sentiment: 'Positive',
    sentimentScore: 0.8
  },
  {
    title: 'Avances médicos: Nueva vacuna muestra resultados prometedores',
    description: 'Científicos afirman que la nueva vacuna podría prevenir múltiples cepas virales con una sola dosis.',
    content: 'Contenido completo del artículo sobre salud...',
    url: 'https://example.com/es-salud-vacuna',
    urlToImage: 'https://images.unsplash.com/photo-1584308666744-24d59b298f07?w=800&q=80',
    publishedAt: new Date(Date.now() - 3600000),
    source: { id: null, name: 'Noticias Médicas' },
    category: 'Health',
    language: 'es',
    country: 'global',
    sentiment: 'Positive',
    sentimentScore: 0.9
  },
  {
    title: 'El equipo nacional gana el campeonato mundial',
    description: 'En un partido emocionante, el equipo logró asegurar la victoria en los últimos minutos.',
    content: 'Contenido completo sobre deportes...',
    url: 'https://example.com/es-deportes-campeonato',
    urlToImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
    publishedAt: new Date(Date.now() - 7200000),
    source: { id: null, name: 'Deportes Hoy' },
    category: 'Sports',
    language: 'es',
    country: 'global',
    sentiment: 'Positive',
    sentimentScore: 1.0
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    for (const article of dummyArticles) {
      const exists = await News.findOne({ url: article.url });
      if (!exists) {
        await News.create(article);
        console.log('Inserted:', article.title);
      } else {
        console.log('Already exists:', article.title);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
