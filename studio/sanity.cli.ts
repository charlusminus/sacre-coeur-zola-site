import {defineCliConfig} from 'sanity/cli'

declare const process: {env: Record<string, string | undefined>}

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'vqyjjech',
    dataset: 'production',
  },
  // Studio hébergé par Sanity (npx sanity deploy) : accès réservé aux membres invités du projet.
  studioHost: 'sacrecoeurzola',
})
