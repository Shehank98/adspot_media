/**
 * Seed publication_groups and newspapers tables from config.js data.
 * Run once after running migration 002_publications.sql:
 *   DATABASE_URL=postgresql://... node server/scripts/seed-publications.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const PUBLICATIONS = [
    {
        id: 'lake-house',
        name: 'Lake House (ANCL) ලේක් හව්ස්',
        contactEmail: '',
        sortOrder: 1,
        newspapers: [
            { id: 'daily-news',             name: 'Daily News',           language: 'english', bwRate: 400,  colorRate: 560,  classifiedBase: 1000, classifiedFreeWords: 20, classifiedExtraRate: 45, isSundayPaper: false },
            { id: 'sunday-observer',         name: 'Sunday Observer',      language: 'english', bwRate: 550,  colorRate: 730,  classifiedBase: 2200, classifiedFreeWords: 20, classifiedExtraRate: 55, isSundayPaper: true  },
            { id: 'dinamina',                name: 'Dinamina',             language: 'sinhala', bwRate: 450,  colorRate: 575,  classifiedBase: 1500, classifiedFreeWords: 20, classifiedExtraRate: 40, isSundayPaper: false },
            { id: 'silumina',                name: 'Silumina',             language: 'sinhala', bwRate: 910,  colorRate: 1195, classifiedBase: 2000, classifiedFreeWords: 25, classifiedExtraRate: 50, isSundayPaper: true  },
            { id: 'thinakaran',              name: 'Daily Thinakaran',     language: 'tamil',   bwRate: 360,  colorRate: 445,  classifiedBase: 1400, classifiedFreeWords: 20, classifiedExtraRate: 35, isSundayPaper: false },
            { id: 'thinakaran-varamanjari',  name: 'Sunday Thinakaran',    language: 'tamil',   bwRate: 450,  colorRate: 540,  classifiedBase: 1600, classifiedFreeWords: 25, classifiedExtraRate: 40, isSundayPaper: true  }
        ]
    },
    {
        id: 'wijeya',
        name: 'Wijeya Newspapers විජය',
        contactEmail: '',
        sortOrder: 2,
        newspapers: [
            { id: 'sunday-times',            name: 'Sunday Times',         language: 'english', bwRate: 650,  colorRate: 790,  classifiedBase: 500,  classifiedFreeWords: 15, classifiedExtraRate: 20, isSundayPaper: true  },
            { id: 'daily-mirror',            name: 'Daily Mirror',         language: 'english', bwRate: 490,  colorRate: 580,  classifiedBase: 200,  classifiedFreeWords: 15, classifiedExtraRate: 15, isSundayPaper: false },
            { id: 'lankadeepa',              name: 'Daily Lankadeepa',     language: 'sinhala', bwRate: 650,  colorRate: 770,  classifiedBase: 525,  classifiedFreeWords: 15, classifiedExtraRate: 25, isSundayPaper: false },
            { id: 'lankadeepa-irida',        name: 'Sunday Lankadeepa',    language: 'sinhala', bwRate: 1120, colorRate: 1310, classifiedBase: 2200, classifiedFreeWords: 15, classifiedExtraRate: 50, isSundayPaper: true  },
            { id: 'daily-ft',                name: 'Daily FT',             language: 'english', bwRate: 420,  colorRate: 500,  classifiedBase: 0,    classifiedFreeWords: 0,  classifiedExtraRate: 0,  isSundayPaper: false }
        ]
    },
    {
        id: 'upali',
        name: 'Upali Newspapers',
        contactEmail: '',
        sortOrder: 3,
        newspapers: [
            { id: 'the-island',              name: 'Daily Island',         language: 'english', bwRate: 220,  colorRate: 352,  classifiedBase: 115,  classifiedFreeWords: 20, classifiedExtraRate: 12, isSundayPaper: false },
            { id: 'sunday-island',           name: 'Sunday Island',        language: 'english', bwRate: 285,  colorRate: 456,  classifiedBase: 160,  classifiedFreeWords: 20, classifiedExtraRate: 12, isSundayPaper: true  },
            { id: 'divaina',                 name: 'Daily Divaina',        language: 'sinhala', bwRate: 350,  colorRate: 560,  classifiedBase: 200,  classifiedFreeWords: 20, classifiedExtraRate: 12, isSundayPaper: false },
            { id: 'irida-divaina',           name: 'Sunday Divaina',       language: 'sinhala', bwRate: 650,  colorRate: 1040, classifiedBase: 500,  classifiedFreeWords: 20, classifiedExtraRate: 20, isSundayPaper: true  },
            { id: 'navaliya',                name: 'Navaliya',             language: 'sinhala', bwRate: 280,  colorRate: 448,  classifiedBase: 120,  classifiedFreeWords: 20, classifiedExtraRate: 6,  isSundayPaper: false }
        ]
    },
    {
        id: 'express',
        name: 'Express Newspapers',
        contactEmail: '',
        sortOrder: 4,
        newspapers: [
            { id: 'virakesari',              name: 'Daily Virakesari',     language: 'tamil',   bwRate: 400,  colorRate: 600,  classifiedBase: 500,  classifiedFreeWords: 20, classifiedExtraRate: 10, isSundayPaper: false },
            { id: 'virakesari-sunday',       name: 'Sunday Virakesari',    language: 'tamil',   bwRate: 600,  colorRate: 900,  classifiedBase: 900,  classifiedFreeWords: 20, classifiedExtraRate: 20, isSundayPaper: true  }
        ]
    },
    {
        id: 'mawbima',
        name: 'Mawbima Group',
        contactEmail: '',
        sortOrder: 5,
        newspapers: [
            { id: 'mawbima',                 name: 'Daily Mawbima',        language: 'sinhala', bwRate: 400,  colorRate: 640,  classifiedBase: 0,    classifiedFreeWords: 0,  classifiedExtraRate: 0,  isSundayPaper: false },
            { id: 'Sunday-Mawbima',          name: 'Sunday Mawbima',       language: 'sinhala', bwRate: 750,  colorRate: 1150, classifiedBase: 0,    classifiedFreeWords: 0,  classifiedExtraRate: 0,  isSundayPaper: true  },
            { id: 'ceylon-today',            name: 'Daily Ceylon Today',   language: 'english', bwRate: 300,  colorRate: 450,  classifiedBase: 0,    classifiedFreeWords: 0,  classifiedExtraRate: 0,  isSundayPaper: false },
            { id: 'Sunday-ceylon-today',     name: 'Sunday Ceylon Today',  language: 'english', bwRate: 450,  colorRate: 600,  classifiedBase: 0,    classifiedFreeWords: 0,  classifiedExtraRate: 0,  isSundayPaper: false }
        ]
    },
    {
        id: 'liberty',
        name: 'Liberty Publication',
        contactEmail: '',
        sortOrder: 6,
        newspapers: [
            { id: 'Sunday-aruna',            name: 'Sathi aga Aruna',      language: 'sinhala', bwRate: 780,  colorRate: 1260, classifiedBase: 990,  classifiedFreeWords: 15, classifiedExtraRate: 50, isSundayPaper: true  },
            { id: 'the-morning',             name: 'The Morning',          language: 'english', bwRate: 510,  colorRate: 620,  classifiedBase: 0,    classifiedFreeWords: 0,  classifiedExtraRate: 0,  isSundayPaper: true  }
        ]
    }
];

async function seed() {
    console.log('🌱 Seeding publications...\n');

    let groupCount = 0;
    let paperCount = 0;

    for (const pub of PUBLICATIONS) {
        await pool.query(
            `INSERT INTO publication_groups (id, name, contact_email, sort_order)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               contact_email = EXCLUDED.contact_email,
               sort_order = EXCLUDED.sort_order,
               updated_at = NOW()`,
            [pub.id, pub.name, pub.contactEmail, pub.sortOrder]
        );
        groupCount++;

        for (let i = 0; i < pub.newspapers.length; i++) {
            const n = pub.newspapers[i];
            await pool.query(
                `INSERT INTO newspapers
                   (id, group_id, name, language, bw_rate, color_rate,
                    classified_base, classified_free_words, classified_extra_rate,
                    is_sunday_paper, sort_order)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   language = EXCLUDED.language,
                   bw_rate = EXCLUDED.bw_rate,
                   color_rate = EXCLUDED.color_rate,
                   classified_base = EXCLUDED.classified_base,
                   classified_free_words = EXCLUDED.classified_free_words,
                   classified_extra_rate = EXCLUDED.classified_extra_rate,
                   is_sunday_paper = EXCLUDED.is_sunday_paper,
                   sort_order = EXCLUDED.sort_order,
                   updated_at = NOW()`,
                [n.id, pub.id, n.name, n.language,
                 n.bwRate, n.colorRate,
                 n.classifiedBase, n.classifiedFreeWords, n.classifiedExtraRate,
                 n.isSundayPaper, i]
            );
            paperCount++;
        }

        console.log(`  ✅ ${pub.name} — ${pub.newspapers.length} newspapers`);
    }

    console.log(`\n📊 Seeded: ${groupCount} groups, ${paperCount} newspapers`);
    await pool.end();
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
