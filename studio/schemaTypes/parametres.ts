import {defineArrayMember, defineField, defineType} from 'sanity'
import {sansCadratin, telephoneValide} from './commun'

const civilite = defineField({name: 'civilite', title: 'Civilité', type: 'string', options: {list: ['Mme', 'M.'], layout: 'radio', direction: 'horizontal'}, validation: (r) => r.required()})
const personne = (name: string, title: string, fonction = false) =>
  defineField({
    name,
    title,
    type: 'object',
    group: 'equipe',
    options: {columns: 2},
    fields: [
      civilite,
      defineField({name: 'prenom', title: 'Prénom', type: 'string', validation: (r) => r.required()}),
      defineField({name: 'nom', title: 'Nom', type: 'string', validation: (r) => r.required()}),
      ...(fonction
        ? [defineField({name: 'fonction', title: 'Fonction', type: 'string', options: {list: ["cheffe d'établissement", "chef d'établissement"]}, validation: (r) => r.required()})]
        : []),
    ],
    validation: (r) => r.required(),
  })

// Document unique « Informations générales » : ce qui change rarement mais doit pouvoir changer
// sans développeur (coordonnées, direction, équipe, accès, rentrée). La structure des pages, elle,
// reste dans le code.
export default defineType({
  name: 'parametres',
  title: 'Informations générales',
  type: 'document',
  groups: [
    {name: 'contact', title: 'Coordonnées', default: true},
    {name: 'equipe', title: 'Direction et équipe'},
    {name: 'inscriptions', title: 'Inscriptions'},
  ],
  fields: [
    defineField({name: 'telephone', title: 'Téléphone de l\'école', type: 'string', group: 'contact', validation: (r) => r.required().custom(telephoneValide)}),
    defineField({name: 'telephoneMobile', title: 'Téléphone portable (SMS des absences)', type: 'string', group: 'contact', validation: (r) => r.custom(telephoneValide)}),
    defineField({name: 'emailSecretariat', title: 'E-mail du secrétariat', type: 'string', group: 'contact', validation: (r) => r.required().email()}),
    defineField({name: 'emailDirection', title: 'E-mail de la direction', type: 'string', group: 'contact', validation: (r) => r.required().email()}),
    defineField({
      name: 'horairesSecretariat',
      title: 'Horaires du secrétariat',
      type: 'array',
      group: 'contact',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'creneau',
          fields: [
            defineField({name: 'jours', title: 'Jours', type: 'string', description: '« Lundi et vendredi »', validation: (r) => r.required()}),
            defineField({name: 'heures', title: 'Heures', type: 'string', description: '« 7 h 45 à 12 h 30 »', validation: (r) => r.required()}),
          ],
          preview: {select: {title: 'jours', subtitle: 'heures'}},
        }),
      ],
    }),
    defineField({name: 'accesTransports', title: 'Venir en transports', type: 'text', rows: 2, group: 'contact', description: '« Bus : arrêt Zola, lignes 11 et 23. »', validation: (r) => r.max(300).custom(sansCadratin)}),
    defineField({name: 'accesStationnement', title: 'Stationnement et dépose', type: 'text', rows: 2, group: 'contact', validation: (r) => r.max(300).custom(sansCadratin)}),
    defineField({name: 'instagram', title: 'Compte Instagram', type: 'url', group: 'contact'}),

    personne('direction', 'Direction', true),
    personne('secretariat', 'Secrétariat'),
    defineField({
      name: 'equipe',
      title: 'L\'équipe (page « L\'école »)',
      type: 'array',
      group: 'equipe',
      description: 'Une ligne par classe ou par fonction, dans l\'ordre d\'affichage. Glissez pour réordonner.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'ligneEquipe',
          fields: [
            defineField({name: 'role', title: 'Classe ou fonction', type: 'string', description: '« Petite section », « CP-CE1 », « Secrétariat »', validation: (r) => r.required()}),
            defineField({name: 'noms', title: 'Nom(s)', type: 'string', description: '« Mme Charlène Duret »', validation: (r) => r.required()}),
          ],
          preview: {select: {title: 'role', subtitle: 'noms'}},
        }),
      ],
    }),
    defineField({name: 'anneeEquipe', title: 'Année scolaire de l\'équipe', type: 'string', group: 'equipe', description: '« 2026-2027 »', validation: (r) => r.regex(/^20[0-9]{2}-20[0-9]{2}$/, {name: 'année scolaire'}).error('Écrivez l\'année ainsi : 2026-2027.')}),

    defineField({name: 'rentree', title: 'Prochaine rentrée', type: 'string', group: 'inscriptions', description: '« 2027-2028 » : affichée sur l\'accueil et dans le formulaire.', validation: (r) => r.required().regex(/^20[0-9]{2}-20[0-9]{2}$/, {name: 'année scolaire'}).error('Écrivez l\'année ainsi : 2027-2028.')}),
    defineField({name: 'inscriptionsOuvertes', title: 'Inscriptions ouvertes', type: 'boolean', group: 'inscriptions', initialValue: true}),
    defineField({
      name: 'destinatairesDemandes',
      title: 'Qui reçoit les demandes d\'inscription ?',
      type: 'array',
      group: 'inscriptions',
      description: 'Chaque demande envoyée depuis le site arrive par e-mail à ces adresses.',
      of: [{type: 'string', validation: (r) => r.email()}],
      validation: (r) => r.required().min(1).max(3),
    }),
    defineField({
      name: 'copieCacheeDemandes',
      title: 'En copie cachée (facultatif)',
      type: 'array',
      group: 'inscriptions',
      description: 'Reçoivent aussi chaque demande, sans que les autres destinataires le voient.',
      of: [{type: 'string', validation: (r) => r.email()}],
      validation: (r) => r.max(3),
    }),
  ],
  preview: {prepare: () => ({title: 'Informations générales'})},
})
