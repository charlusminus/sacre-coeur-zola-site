import {defineConfig, defineLocaleResourceBundle, isDev} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {frFRLocale} from '@sanity/locale-fr-fr'
import {schemaTypes} from './schemaTypes'

// Projet Sanity de l'école : identifiant fourni par la variable SANITY_STUDIO_PROJECT_ID
// (fichier .env du dossier studio, jamais versionné, ou variable de la GitHub Action).
declare const process: {env: Record<string, string | undefined>}
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'vqyjjech'

// Documents uniques : on les ouvre directement, sans liste ; ni création d'un second, ni suppression.
const UNIQUES = new Set(['parametres', 'questionsFrequentes', 'pageEcole', 'pageVieScolaire', 'pageCantine', 'pageEcoEcole', 'pagePastorale', 'pageApel', 'pageTarifs'])
// Pages dont le texte s'édite ici (la mise en page reste dans le code du site).
const PAGES = [
  {id: 'pageEcole', titre: 'L\'école (et le mot de la cheffe d\'établissement)'},
  {id: 'pageVieScolaire', titre: 'Vie scolaire (horaires, garderie, vacances)'},
  {id: 'pageCantine', titre: 'Cantine'},
  {id: 'pageEcoEcole', titre: 'Éco-École'},
  {id: 'pagePastorale', titre: 'Pastorale'},
  {id: 'pageApel', titre: 'APEL'},
  {id: 'pageTarifs', titre: 'Tarifs (page Inscriptions)'},
]

export default defineConfig({
  name: 'default',
  title: 'École Sacré-Cœur La Salle',
  projectId,
  dataset: 'production',

  plugins: [
    frFRLocale(),
    structureTool({
      // Ce qu'Anne fait le plus souvent en premier : actualités, agenda, menus. Puis les réglages.
      structure: (S) =>
        S.list()
          .title('Le site de l\'école')
          .items([
            S.listItem()
              .title('Actualités')
              .id('actualites')
              .child(S.documentTypeList('actualite').title('Actualités').defaultOrdering([{field: 'date', direction: 'desc'}])),
            S.listItem()
              .title('Agenda')
              .id('agenda')
              .child(S.documentTypeList('evenement').title('Agenda').defaultOrdering([{field: 'debut', direction: 'desc'}])),
            S.listItem()
              .title('Menus de la cantine')
              .id('menus')
              .child(S.documentTypeList('menu').title('Menus de la cantine').defaultOrdering([{field: 'semaine', direction: 'desc'}])),
            S.divider(),
            S.listItem()
              .title('Informations générales')
              .id('parametres')
              .child(S.document().schemaType('parametres').documentId('parametres').title('Informations générales')),
            S.listItem()
              .title('Questions fréquentes')
              .id('questionsFrequentes')
              .child(S.document().schemaType('questionsFrequentes').documentId('questionsFrequentes').title('Questions fréquentes')),
            S.listItem()
              .title('Textes des pages')
              .id('pages')
              .child(
                S.list()
                  .title('Textes des pages')
                  .items(PAGES.map((p) => S.listItem().title(p.titre).id(p.id).child(S.document().schemaType(p.id).documentId(p.id).title(p.titre)))),
              ),
          ]),
    }),
    ...(isDev ? [visionTool()] : []),
  ],

  // Libellés clarifiés (retour Balinaisa : « Supprimer la publication » confondu avec « Supprimer »).
  i18n: {
    bundles: [
      defineLocaleResourceBundle({
        locale: 'fr-FR',
        namespace: 'structure',
        resources: {
          'action.unpublish.label': 'Dépublier (retirer du site)',
          'action.delete.label': 'Supprimer définitivement',
        },
      }),
    ],
  },

  schema: {
    types: schemaTypes,
    // Le bouton « Créer » ne propose que les contenus à plusieurs exemplaires.
    templates: (modeles) => modeles.filter(({schemaType}) => !UNIQUES.has(schemaType)),
  },

  document: {
    actions: (actions, {schemaType}) =>
      UNIQUES.has(schemaType) ? actions.filter(({action}) => !['delete', 'duplicate', 'unpublish'].includes(action ?? '')) : actions,
    // Pas de « Créer » dans le menu global pour les documents uniques.
    newDocumentOptions: (options) => options.filter((o) => !UNIQUES.has(o.templateId)),
  },
})
