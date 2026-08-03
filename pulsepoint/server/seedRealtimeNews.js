const mongoose = require('mongoose');
require('dotenv').config();
const News = require('./models/News');

const CATEGORIES = ['General', 'Technology', 'Sports', 'Business', 'Entertainment', 'Health', 'Science', 'Politics'];
const LANGUAGES = ['en', 'es', 'fr', 'de'];
const COUNTRIES = ['us', 'in', 'gb', 'au', 'global'];

const articleTemplates = [
  {
    category: 'Technology',
    titles: {
      en: 'Breakthrough in AI Chip Architecture Promises 10x Efficiency Boost',
      es: 'Avance en la arquitectura de chips de IA promete un aumento del 10x en eficiencia',
      fr: 'Une percée dans l\'architecture des puces IA promet un gain d\'efficacité de 10x',
      de: 'Durchbruch bei KI-Chiparchitektur verspricht 10-fache Effizienzsteigerung'
    },
    desc: {
      en: 'Researchers have unveiled a revolutionary semiconductor design that dramatically cuts power consumption for large neural networks.',
      es: 'Investigadores han presentado un diseño revolucionario de semiconductores que reduce drásticamente el consumo de energía para redes neuronales grandes.',
      fr: 'Des chercheurs ont dévoilé une conception de semi-conducteur révolutionnaire qui réduit considérablement la consommation d\'énergie.',
      de: 'Forscher haben ein revolutionäres Halbleiterdesign vorgestellt, das den Stromverbrauch für große neuronale Netze drastisch senkt.'
    }
  },
  {
    category: 'Business',
    titles: {
      en: 'Global Markets Rally as Inflation Expectations Cool Down',
      es: 'Los mercados globales se recuperan mientras las expectativas de inflación se moderan',
      fr: 'Les marchés mondiaux repartent à la hausse alors que les anticipations d\'inflation s\'apaisent',
      de: 'Globale Märkte erholen sich, da die Inflationserwartungen sinken'
    },
    desc: {
      en: 'Major stock indices posted strong gains today following positive economic reports from leading central banks.',
      es: 'Los principales índices bursátiles registraron fuertes ganancias hoy tras informes económicos positivos.',
      fr: 'Les principaux indices boursiers ont registrado de fortes hausses aujourd\'hui à la suite de rapports économiques positifs.',
      de: 'Die wichtigsten Aktienindizes verzeichneten heute nach positiven Wirtschaftsberichten kräftige Gewinne.'
    }
  },
  {
    category: 'Sports',
    titles: {
      en: 'Unbelievable Comeback Seals Championship Victory in Dramatic Finale',
      es: 'Increíble remontada sella la victoria del campeonato en un final dramático',
      fr: 'Une remontée incroyable scelle la victoire du championnat dans une fin dramatique',
      de: 'Unglaubliches Comeback sichert Meisterschaftssieg in dramatischem Finale'
    },
    desc: {
      en: 'Underdogs produce a historic performance in the closing minutes to claim the coveted trophy.',
      es: 'Los aspirantes producen una actuación histórica en los minutos finales para alzarse con el codiciado trofeo.',
      fr: 'Les outsiders réalisent une performance historique dans les dernières minutes pour décrocher le trophée convoité.',
      de: 'Die Außenseiter zeigen in den Schlussminuten eine historische Leistung und sichern sich die begehrte Trophäe.'
    }
  },
  {
    category: 'Science',
    titles: {
      en: 'James Webb Telescope Captures Detailed Atmospheric Data of Exoplanet',
      es: 'El telescopio James Webb captura datos atmosféricos detallados de exoplaneta',
      fr: 'Le télescope James Webb capture des données atmosphériques détaillées d\'une exoplanète',
      de: 'James-Webb-Teleskop erfasst detaillierte Atmosphärendaten eines Exoplaneten'
    },
    desc: {
      en: 'Astronomers detect water vapor and carbon dioxide signatures in a habitable-zone planet atmosphere.',
      es: 'Los astrónomos detectan firmas de vapor de agua y dióxido de carbono en la atmósfera de un planeta en zona habitable.',
      fr: 'Les astronomes détectent des signatures de vapeur d\'eau et de dioxyde de carbone dans l\'atmosphère d\'une planète en zone habitable.',
      de: 'Astronomen entdecken Wasserdampf- und Kohlendioxidsignaturen in der Atmosphäre eines Planeten in der bewohnbaren Zone.'
    }
  },
  {
    category: 'Health',
    titles: {
      en: 'New Clinical Trial Shows High Efficacy in Targeted Cancer Immunotherapy',
      es: 'Nuevo ensayo clínico muestra alta eficacia en inmunoterapia contra el cáncer',
      fr: 'Un nouvel essai clinique montre une grande efficacité dans l\'immunothérapie ciblée du cancer',
      de: 'Neue klinische Studie zeigt hohe Wirksamkeit bei zielgerichteter Krebsimmuntherapie'
    },
    desc: {
      en: 'Phase 3 trials reveal impressive patient response rates with minimal side effects compared to traditional treatments.',
      es: 'Los ensayos de Fase 3 revelan tasas de respuesta de pacientes impresionantes con mínimos efectos secundarios.',
      fr: 'Les essais de phase 3 révèlent des taux de réponse impressionnants chez les patients avec des effets secondaires minimaux.',
      de: 'Phase-3-Studien zeigen beeindruckende Ansprechraten bei Patienten mit minimalen Nebenwirkungen.'
    }
  },
  {
    category: 'General',
    titles: {
      en: 'International Climate Summit Reaches Accord on Renewable Energy Investments',
      es: 'La cumbre internacional sobre el clima alcanza un acuerdo sobre energías renovables',
      fr: 'Le sommet international sur le climat parvient à un accord sur les investissements dans les énergies renouvelables',
      de: 'Internationaler Klimagipfel erzielt Einigung über Investitionen in erneuerbare Energien'
    },
    desc: {
      en: 'Delegates from over 150 nations pledge $500 billion toward green infrastructure over the next decade.',
      es: 'Delegados de más de 150 naciones se comprometen a destinar 500.000 millones de dólares a infraestructuras ecológicas.',
      fr: 'Des délégués de plus de 150 nations s\'engagent à verser 500 milliards de dollars pour les infrastructures vertes.',
      de: 'Delegierte aus über 150 Nationen sagen 500 Milliarden Dollar für grüne Infrastruktur zu.'
    }
  }
];

async function seedRealtimeNews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    let count = 0;
    const now = Date.now();

    // Create real-time news for Today (August 3, 2026), Yesterday (Aug 2), and Aug 1
    for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
      const publishDate = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
      
      for (const tpl of articleTemplates) {
        for (const lang of LANGUAGES) {
          const title = tpl.titles[lang] || tpl.titles['en'];
          const description = tpl.desc[lang] || tpl.desc['en'];
          const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
          const url = `https://pulsepoint.news/realtime/${dayOffset}/${lang}/${tpl.category.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

          const exists = await News.findOne({ title, language: lang, publishedAt: { $gte: new Date(publishDate.setHours(0,0,0,0)), $lte: new Date(publishDate.setHours(23,59,59,999)) } });
          if (!exists) {
            await News.create({
              title: `${title} (${publishDate.toLocaleDateString()})`,
              description,
              content: `${description} Full report coverage updated live on PulsePoint News Network.`,
              url,
              urlToImage: `https://picsum.photos/seed/${tpl.category}-${dayOffset}-${lang}/800/400`,
              publishedAt: publishDate,
              source: { id: 'pulsepoint-realtime', name: 'PulsePoint Live Wire' },
              category: tpl.category,
              language: lang,
              country,
              sentiment: 'Positive',
              sentimentScore: 0.85,
              factCheckScore: 95,
              factCheckLabel: 'Verified'
            });
            count++;
          }
        }
      }
    }

    console.log(`Successfully seeded ${count} real-time articles up to today (${new Date().toLocaleDateString()})!`);
  } catch (err) {
    console.error('Error seeding realtime news:', err);
  } finally {
    mongoose.disconnect();
  }
}

seedRealtimeNews();
