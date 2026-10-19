// Modèle de contenu. Chaque collection préfigure un type de document du futur CMS (Sanity) :
// Anne remplira des champs, jamais une mise en page. Les règles de validation ci-dessous seront
// reprises telles quelles dans le Studio, pour qu'un contenu publié ne casse jamais le build.
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// PUBLIC_CONTENU=sanity : contenus écrits par scripts/sanity-sync.mjs (site en ligne) ; sinon les
// fichiers de démonstration de src/contenus/.
export const racineContenus = process.env.PUBLIC_CONTENU === 'sanity' ? './contenu-sanity' : './src/contenus';

const actualites = defineCollection({
  loader: glob({ pattern: '**/*.md', base: `${racineContenus}/actualites` }),
  schema: ({ image }) => z.object({
    titre: z.string().max(90),
    date: z.coerce.date(),
    resume: z.string().max(220),
    rubrique: z.enum(["Vie de l'école", 'Vie des classes', 'Pastorale', 'Éco-École', 'APEL', 'Sorties', 'Inscriptions']),
    // Niveaux concernés (et non le nom de la classe, qui change d'une année à l'autre).
    niveaux: z.array(z.enum(['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'])).default([]),
    photo: image().optional(),
    alt: z.string().optional(),
  }),
});

const evenements = defineCollection({
  loader: glob({ pattern: '**/*.md', base: `${racineContenus}/evenements` }),
  schema: z.object({
    titre: z.string().max(80),
    debut: z.coerce.date(),
    fin: z.coerce.date().optional(),
    horaires: z.string().optional(),
    lieu: z.string().default('École Sacré-Cœur La Salle'),
    public: z.enum(["Familles de l'école", 'Futures familles', 'Tout public']),
    resume: z.string().max(200),
    enAvant: z.boolean().default(false),
  }),
});

// Menus de la cantine : le PDF de la semaine, mis en ligne à la date choisie par Anne (par défaut
// le vendredi précédent à 8 h, voir src/lib/contenu.ts).
const menus = defineCollection({
  loader: file(`${racineContenus}/menus/menus.json`),
  schema: z.object({
    semaine: z.coerce.date(),
    pdf: z.string().regex(/^[a-z0-9-]+\.pdf$/),
    publierLe: z.coerce.date().optional(),
    message: z.string().max(200).optional(),
  }),
});

export const collections = { actualites, evenements, menus };
