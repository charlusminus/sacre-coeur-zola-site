import {defineField, defineType} from 'sanity'
import {PUBLICS, sansCadratin, dateLisible} from './commun'

export default defineType({
  name: 'evenement',
  title: 'Événement',
  type: 'document',
  fields: [
    defineField({
      name: 'titre',
      title: 'Titre',
      type: 'string',
      description: '« Portes ouvertes », « Fête de Noël », « Vacances d\'hiver ». 80 caractères au plus.',
      validation: (r) => r.required().max(80).custom(sansCadratin),
    }),
    defineField({
      name: 'debut',
      title: 'Date (ou premier jour)',
      type: 'datetime',
      options: {dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', timeStep: 15},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'fin',
      title: 'Dernier jour',
      type: 'datetime',
      description: 'Seulement pour un événement sur plusieurs jours (vacances, séjour).',
      options: {dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', timeStep: 15},
      validation: (r) =>
        r.custom((fin, ctx) => {
          const debut = (ctx.document as {debut?: string})?.debut
          return !fin || !debut || fin >= debut ? true : 'Le dernier jour doit venir après le premier.'
        }),
    }),
    defineField({
      name: 'horaires',
      title: 'Horaires',
      type: 'string',
      description: 'En toutes lettres : « 10 h à 12 h », « toute la journée ».',
      validation: (r) => r.max(60).custom(sansCadratin),
    }),
    defineField({
      name: 'lieu',
      title: 'Lieu',
      type: 'string',
      initialValue: 'École Sacré-Cœur La Salle',
      validation: (r) => r.max(80).custom(sansCadratin),
    }),
    defineField({
      name: 'public',
      title: 'Pour qui ?',
      type: 'string',
      options: {list: PUBLICS, layout: 'radio'},
      initialValue: "Familles de l'école",
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'resume',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: '200 caractères au plus.',
      validation: (r) => r.required().max(200).custom(sansCadratin),
    }),
    defineField({
      name: 'enAvant',
      title: 'Mettre en avant sur l\'accueil',
      description: 'Pour les grands rendez-vous : portes ouvertes, fête de l\'école.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  orderings: [{title: 'Par date', name: 'debutDesc', by: [{field: 'debut', direction: 'desc'}]}],
  preview: {
    select: {title: 'titre', debut: 'debut', public: 'public'},
    prepare: ({title, debut, public: pour}) => ({title, subtitle: [dateLisible(debut), pour].filter(Boolean).join(' · ')}),
  },
})
