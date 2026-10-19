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
