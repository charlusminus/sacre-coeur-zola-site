import {defineField, defineType} from 'sanity'
import {dateLisible} from './commun'

// Le menu de la cantine reste un PDF (celui que Convivio envoie), comme sur l'ancien site. Anne
// dépose les PDF d'une période d'un coup ; chacun apparaît sur le site le vendredi qui précède sa
// semaine à 8 h, sauf si elle choisit une autre date.
const lundi = (d?: string) => !d || new Date(`${d}T12:00:00`).getDay() === 1

export default defineType({
  name: 'menu',
  title: 'Menu de la cantine',
  type: 'document',
  fields: [
    defineField({
      name: 'semaine',
      title: 'Semaine du lundi',
      type: 'date',
      description: 'Choisissez le lundi de la semaine du menu.',
      options: {dateFormat: 'DD/MM/YYYY'},
      validation: (r) => r.required().custom((d?: string) => (lundi(d) ? true : 'Choisissez un lundi.')),
    }),
    defineField({
      name: 'pdf',
      title: 'Menu (PDF)',
      type: 'file',
      options: {accept: 'application/pdf'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publierLe',
      title: 'Mettre en ligne le',
      type: 'datetime',
      description: 'Laissez vide : le menu apparaît le vendredi précédent à 8 h.',
      options: {dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', timeStep: 15},
    }),
    defineField({
      name: 'message',
      title: 'Petit mot (facultatif)',
      type: 'text',
      rows: 2,
      description: 'Laissez vide : « Voici le menu de la cantine pour la semaine du … ». Exemple de mot : « Jeudi, repas de Noël ! »',
      validation: (r) => r.max(200),
    }),
  ],
  orderings: [{title: 'Par semaine', name: 'semaineDesc', by: [{field: 'semaine', direction: 'desc'}]}],
  preview: {
    select: {semaine: 'semaine', publierLe: 'publierLe'},
    prepare: ({semaine, publierLe}) => ({
      title: semaine ? `Semaine du ${dateLisible(semaine).replace(/^lundi /, '')}` : 'Menu sans semaine',
      subtitle: publierLe ? `En ligne le ${dateLisible(publierLe)}` : 'En ligne le vendredi précédent à 8 h',
    }),
  },
})
