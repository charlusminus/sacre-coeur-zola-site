import {defineArrayMember, defineField, defineType} from 'sanity'
import {sansCadratin} from './commun'

// Textes des pages : un champ par bloc, à sa place fixe dans la page. La mise en page ne change pas.
// Un champ laissé vide garde le texte d'origine du site.
const AIDE_PARAGRAPHES = 'Laissez une ligne vide entre deux paragraphes.'
const ligne = (name: string, title: string, max = 120, description?: string) =>
  defineField({name, title, type: 'string', description, validation: (r) => r.max(max).custom(sansCadratin)})
const texte = (name: string, title: string, max = 1500, rows = 5) =>
  defineField({name, title, type: 'text', rows, description: AIDE_PARAGRAPHES, validation: (r) => r.max(max).custom(sansCadratin)})
const tete = [
  ligne('surtitre', 'Petite ligne au-dessus du titre', 80),
  ligne('titre', 'Titre de la page', 110),
  defineField({name: 'chapo', title: 'Phrase d\'introduction', type: 'text', rows: 3, validation: (r) => r.max(320).custom(sansCadratin)}),
]
const photo = defineField({
  name: 'photo',
  title: 'Photo',
  type: 'image',
  description: 'Laissez vide pour garder la photo actuelle. Jamais de visage d\'enfant : de dos, des mains, des lieux.',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Que montre la photo ?',
      type: 'string',
      description: 'Une phrase pour les personnes qui ne voient pas l\'image.',
      validation: (r) => r.custom((v, ctx) => ((ctx.parent as {asset?: unknown})?.asset && !v ? 'Décrivez la photo en une phrase.' : true)),
    }),
  ],
})

export const pageEcoEcole = defineType({
  name: 'pageEcoEcole',
  title: 'Page Éco-École',
  type: 'document',
  fields: [
    ...tete,
    ligne('anneesTitre', 'Titre des années'),
    defineField({
      name: 'annees',
      title: 'Les années',
      type: 'array',
      description: 'Une ligne par année, dans l\'ordre.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'anneeEco',
          fields: [
            defineField({name: 'annee', title: 'Année scolaire', type: 'string', description: '« 2026-2027 »', validation: (r) => r.required().regex(/^20[0-9]{2}-20[0-9]{2}$/, {name: 'année scolaire'}).error('Écrivez l\'année ainsi : 2026-2027.')}),
            defineField({name: 'theme', title: 'Thème', type: 'string', validation: (r) => r.required().max(60).custom(sansCadratin)}),
            defineField({name: 'texte', title: 'Ce que font les classes', type: 'text', rows: 3, validation: (r) => r.required().max(400).custom(sansCadratin)}),
          ],
          preview: {select: {title: 'annee', subtitle: 'theme'}},
        }),
      ],
    }),
    photo,
    ligne('elevesTitre', 'Titre du bloc sur les élèves'),
    texte('elevesTexte', 'Texte du bloc sur les élèves'),
  ],
  preview: {prepare: () => ({title: 'Page Éco-École'})},
})

export const pagePastorale = defineType({
  name: 'pagePastorale',
  title: 'Page Pastorale',
  type: 'document',
  fields: [
    ...tete,
    ligne('tempsFortsTitre', 'Titre des temps forts'),
    defineField({
      name: 'tempsForts',
      title: 'Les temps forts',
      type: 'array',
      description: 'Dans l\'ordre de l\'année.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tempsFort',
          fields: [
            defineField({name: 'nom', title: 'Temps fort', type: 'string', description: '« Avent et Noël »', validation: (r) => r.required().max(60).custom(sansCadratin)}),
            defineField({name: 'texte', title: 'Ce qui se passe', type: 'text', rows: 2, validation: (r) => r.required().max(300).custom(sansCadratin)}),
          ],
          preview: {select: {title: 'nom', subtitle: 'texte'}},
        }),
      ],
    }),
    texte('tempsFortsTexte', 'Texte sous les temps forts', 800, 3),
    photo,
    ligne('eveilTitre', 'Titre : éveil à la foi'),
    texte('eveilTexte', 'Texte : éveil à la foi', 800, 3),
    ligne('lasallienneTitre', 'Titre : école lasallienne'),
    texte('lasallienneTexte', 'Texte : école lasallienne'),
    ligne('solidariteTitre', 'Titre : solidarité'),
    texte('solidariteTexte', 'Texte : solidarité'),
  ],
  preview: {prepare: () => ({title: 'Page Pastorale'})},
})

export const pageTarifs = defineType({
  name: 'pageTarifs',
  title: 'Tarifs',
  type: 'document',
  fields: [
    ligne('titre', 'Titre', 60, '« Tarifs 2026-2027 »'),
    ligne('note', 'Petite ligne sous le titre', 160),
    texte('intro', 'Texte d\'introduction', 800, 3),
    defineField({
      name: 'lignes',
      title: 'Les tarifs',
      type: 'array',
      description: 'Une ligne par tarif, dans l\'ordre du tableau.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'ligneTarif',
          fields: [
            defineField({name: 'libelle', title: 'Quoi', type: 'string', description: '« Garderie du matin »', validation: (r) => r.required().max(60).custom(sansCadratin)}),
            defineField({name: 'montant', title: 'Combien', type: 'string', description: '« 1,50 € par matin »', validation: (r) => r.required().max(200).custom(sansCadratin)}),
          ],
          preview: {select: {title: 'libelle', subtitle: 'montant'}},
        }),
      ],
    }),
    ligne('legende', 'Note sous le tableau', 300),
    defineField({name: 'exemple', title: 'Exemple de coût mensuel', type: 'text', rows: 3, validation: (r) => r.max(400).custom(sansCadratin)}),
    ligne('solidarite', 'Phrase sur la contribution de solidarité', 300),
  ],
  preview: {prepare: () => ({title: 'Tarifs'})},
})

// Une liste de blocs « titre + texte » (fiches de la cantine, actions de l'APEL).
const fiches = (description: string) =>
  defineField({
    name: 'fiches',
    title: 'Les blocs',
    type: 'array',
    description,
    of: [
      defineArrayMember({
        type: 'object',
        name: 'fiche',
        fields: [
          defineField({name: 'titre', title: 'Titre', type: 'string', validation: (r) => r.required().max(60).custom(sansCadratin)}),
          defineField({name: 'texte', title: 'Texte', type: 'text', rows: 3, validation: (r) => r.required().max(500).custom(sansCadratin)}),
        ],
        preview: {select: {title: 'titre', subtitle: 'texte'}},
      }),
    ],
  })

export const pageEcole = defineType({
  name: 'pageEcole',
  title: 'Page L\'école',
  type: 'document',
  groups: [
    {name: 'mot', title: 'Mot de la cheffe d\'établissement', default: true},
    {name: 'projet', title: 'Projet éducatif'},
    {name: 'equipe', title: 'Équipe et histoire'},
  ],
  fields: [
    ...tete.map((f) => ({...f, group: 'mot'})),
    {...ligne('motTitre', 'Titre du mot'), group: 'mot'},
    {...texte('motTexte', 'Le mot, en entier', 4000, 14), group: 'mot'},
    defineField({name: 'motCitation', title: 'Extrait cité sur la page d\'accueil', type: 'text', rows: 3, group: 'mot', description: 'Une ou deux phrases, sans guillemets.', validation: (r) => r.max(300).custom(sansCadratin)}),
    {...ligne('projetSurtitre', 'Petite ligne au-dessus du projet', 60, '« Projet éducatif 2025-2030 »'), group: 'projet'},
    {...ligne('projetTitre', 'Titre du projet éducatif'), group: 'projet'},
    defineField({
      name: 'axes',
      title: 'Les axes du projet',
      type: 'array',
      group: 'projet',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'axe',
          fields: [
            defineField({name: 'titre', title: 'Axe', type: 'string', validation: (r) => r.required().max(80).custom(sansCadratin)}),
            defineField({name: 'points', title: 'Ce qu\'il recouvre', type: 'array', of: [defineArrayMember({type: 'string', validation: (r) => r.max(140).custom(sansCadratin)})], validation: (r) => r.required().min(1)}),
          ],
          preview: {select: {title: 'titre'}},
        }),
      ],
    }),
    {...ligne('equipeTitre', 'Titre du bloc équipe'), group: 'equipe'},
    {...texte('equipeTexte', 'Texte du bloc équipe', 600, 3), group: 'equipe'},
    {...photo, group: 'equipe'},
    {...ligne('histoireTitre', 'Titre de l\'histoire'), group: 'equipe'},
    {...texte('histoireTexte', 'Texte de l\'histoire', 800, 3), group: 'equipe'},
    defineField({
      name: 'dates',
      title: 'Les dates de l\'histoire',
      type: 'array',
      group: 'equipe',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'date',
          fields: [
            defineField({name: 'annee', title: 'Année', type: 'string', validation: (r) => r.required().regex(/^[0-9]{4}$/, {name: 'année'}).error('Une année sur quatre chiffres.')}),
            defineField({name: 'texte', title: 'Ce qui s\'est passé', type: 'text', rows: 2, validation: (r) => r.required().max(300).custom(sansCadratin)}),
          ],
          preview: {select: {title: 'annee', subtitle: 'texte'}},
        }),
      ],
    }),
    {...texte('ogecTexte', 'Texte : l\'OGEC', 600, 3), group: 'equipe'},
    {...texte('reseauTexte', 'Texte : le réseau La Salle', 800, 3), group: 'equipe'},
  ],
  preview: {prepare: () => ({title: 'Page L\'école'})},
})

export const pageVieScolaire = defineType({
  name: 'pageVieScolaire',
  title: 'Page Vie scolaire',
  type: 'document',
  fields: [
    ...tete,
    texte('horairesTexte', 'Texte des horaires', 400, 2),
    defineField({
      name: 'horaires',
      title: 'Les horaires',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'horaire',
          fields: [
            defineField({name: 'moment', title: 'Moment', type: 'string', description: '« Classe le matin »', validation: (r) => r.required().max(60).custom(sansCadratin)}),
            defineField({name: 'horaire', title: 'Horaire', type: 'string', description: '« 8 h 30 à 11 h 45 »', validation: (r) => r.required().max(160).custom(sansCadratin)}),
          ],
          preview: {select: {title: 'moment', subtitle: 'horaire'}},
        }),
      ],
    }),
    texte('cantineTexte', 'Texte sur la cantine', 400, 2),
    texte('garderieMatin', 'Garderie du matin', 400, 2),
    texte('garderieSoir', 'Garderie et étude du soir', 500, 3),
    texte('ateliers', 'Ateliers périscolaires', 600, 3),
    texte('calendrier', 'Calendrier des vacances', 1200, 6),
    texte('application', 'L\'application des familles', 400, 2),
  ],
  preview: {prepare: () => ({title: 'Page Vie scolaire'})},
})

export const pageCantine = defineType({
  name: 'pageCantine',
  title: 'Page Cantine',
  type: 'document',
  fields: [
    defineField({name: 'chapo', title: 'Phrase d\'introduction', type: 'text', rows: 3, validation: (r) => r.max(320).custom(sansCadratin)}),
    ligne('codeClicetmiam', 'Code Clic & Miam des familles', 20),
    fiches('Les trois blocs « Comment ça marche ».'),
  ],
  preview: {prepare: () => ({title: 'Page Cantine'})},
})

export const pageApel = defineType({
  name: 'pageApel',
  title: 'Page APEL',
  type: 'document',
  fields: [...tete, fiches('Ce que fait l\'APEL, dans l\'ordre d\'affichage.')],
  preview: {prepare: () => ({title: 'Page APEL'})},
})
