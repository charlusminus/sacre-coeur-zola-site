import {defineCliConfig} from 'sanity/cli'

declare const process: {env: Record<string, string | undefined>}

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'vqyjjech',
    dataset: 'production',
  },
  // Studio hébergé par Sanity (npx sanity deploy) : accès réservé aux membres invités du projet.
  studioHost: 'sacrecoeurzola',
  // Identifiant du back-office publié (premier envoi par la GitHub Action, 19/10/2026).
  deployment: {appId: 'hdtjkc5u1al7mvomdy1p3kj5', autoUpdates: true},
})
