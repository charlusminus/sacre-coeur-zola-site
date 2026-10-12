// Modèle de contenu. Chaque collection préfigure un type de document du futur CMS (Sanity) :
// Anne remplira des champs, jamais une mise en page. Les règles de validation ci-dessous seront
// reprises telles quelles dans le Studio, pour qu'un contenu publié ne casse jamais le build.
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const actualites = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/contenus/actualites' }),
  schema: ({ image }) => z.object({
    titre: z.string().max(90),
    date: z.coerce.date(),
    resume: z.string().max(220),
    rubrique: z.enum(["Vie de l'école", 'Pastorale', 'APEL', 'Sorties', 'Inscriptions']),
    photo: image().optional(),
    alt: z.string().optional(),
  }),
});

const evenements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/contenus/evenements' }),
  schema: z.object({
    titre: z.string().max(80),
    debut: z.coerce.date(),
    fin: z.coerce.date().optional(),
    horaires: z.string().optional(),
    lieu: z.string().default('École Sacré-Coeur La Salle'),
    public: z.enum(["Familles de l'école", 'Futures familles', 'Tout public']),
    resume: z.string().max(200),
    enAvant: z.boolean().default(false),
  }),
});

const plat = z.object({ entree: z.string(), plat: z.string(), accompagnement: z.string().optional(), dessert: z.string() });
const menus = defineCollection({
  loader: file('./src/contenus/menus/menus.json'),
  schema: z.object({
    semaine: z.coerce.date(),
    lundi: plat.optional(), mardi: plat.optional(), jeudi: plat.optional(), vendredi: plat.optional(),
  }),
});

export const collections = { actualites, evenements, menus };
