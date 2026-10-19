import {defineArrayMember, defineField, defineType} from 'sanity'
import {sansCadratin} from './commun'

export default defineType({
  name: 'questionsFrequentes',
  title: 'Questions fréquentes',
  type: 'document',
  fields: [
    defineField({
      name: 'questions',
      title: 'Questions',
      type: 'array',
      description: 'Dans l\'ordre d\'affichage : glissez une question pour la déplacer.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'question',
          fields: [
            defineField({name: 'question', title: 'Question', type: 'string', validation: (r) => r.required().max(140).custom(sansCadratin)}),
            defineField({name: 'reponse', title: 'Réponse', type: 'text', rows: 4, validation: (r) => r.required().max(900).custom(sansCadratin)}),
            defineField({
              name: 'theme',
              title: 'Où l\'afficher ?',
              type: 'string',
              options: {
                list: [
                  {title: 'Page Inscriptions', value: 'inscription'},
                  {title: 'L\'école', value: 'ecole'},
                  {title: 'Vie scolaire', value: 'vie'},
                ],
                layout: 'radio',
              },
              validation: (r) => r.required(),
            }),
          ],
          preview: {select: {title: 'question', subtitle: 'theme'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Questions fréquentes'})},
})
