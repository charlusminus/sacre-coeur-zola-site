import {defineArrayMember, defineType} from 'sanity'

// Texte d'un article : des paragraphes, du gras, de l'italique, des listes et des liens. Pas de
// titres ni de mise en page : le gabarit du site s'en charge.
export default defineType({
  name: 'texteArticle',
  title: 'Texte',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{title: 'Paragraphe', value: 'normal'}],
      lists: [
        {title: 'Liste à puces', value: 'bullet'},
        {title: 'Liste numérotée', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Gras', value: 'strong'},
          {title: 'Italique', value: 'em'},
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Lien',
            fields: [
              {
                name: 'href',
                type: 'url',
                title: 'Adresse du lien',
                description: 'Copiez l\'adresse de la page, par exemple https://www.nantes.fr',
                validation: (r) => r.required().uri({scheme: ['http', 'https', 'mailto', 'tel']}),
              },
            ],
          },
        ],
      },
    }),
  ],
})
