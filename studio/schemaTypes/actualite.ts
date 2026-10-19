import {defineField, defineType} from 'sanity'
import {NIVEAUX, RUBRIQUES, sansCadratin, dateLisible} from './commun'

export default defineType({
  name: 'actualite',
  title: 'Actualité',
  type: 'document',
  fields: [
    defineField({
      name: 'titre',
      title: 'Titre',
      type: 'string',
      description: 'Court et concret : « Les CP plantent leur potager ». 90 caractères au plus.',
      validation: (r) => r.required().max(90).custom(sansCadratin),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      options: {dateFormat: 'DD/MM/YYYY'},
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'rubrique',
      title: 'Rubrique',
      type: 'string',
      options: {list: RUBRIQUES, layout: 'radio'},
      initialValue: 'Vie des classes',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'niveaux',
      title: 'Classes concernées',
      description: 'Cochez les niveaux. Rien de coché : l\'article concerne toute l\'école.',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: NIVEAUX, layout: 'grid'},
    }),
    defineField({
      name: 'resume',
      title: 'Résumé',
      type: 'text',
      rows: 3,
      description: 'Une ou deux phrases, affichées dans les listes et sur Google. 220 caractères au plus.',
      validation: (r) => r.required().max(220).custom(sansCadratin),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      description: 'Aucun visage d\'enfant : des enfants de dos, des mains, des lieux, des objets.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Que montre la photo ?',
          type: 'string',
          description: 'Une phrase pour les personnes qui ne voient pas l\'image : « Des mains plantent des radis dans le potager ».',
          validation: (r) => r.max(160).custom(sansCadratin),
        }),
      ],
    }),
    defineField({
      name: 'texte',
      title: 'Texte de l\'article',
      type: 'texteArticle',
    }),
  ],
  orderings: [{title: 'Plus récentes d\'abord', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'titre', date: 'date', rubrique: 'rubrique', media: 'photo'},
    prepare: ({title, date, rubrique, media}) => ({title, subtitle: [dateLisible(date), rubrique].filter(Boolean).join(' · '), media}),
  },
})
