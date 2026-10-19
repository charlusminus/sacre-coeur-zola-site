// Listes fermées partagées avec le site (src/content.config.ts) : une valeur ajoutée ici doit
// l'être aussi là-bas, sinon le contenu est écarté au build avec un avertissement.
export const RUBRIQUES = ["Vie de l'école", 'Vie des classes', 'Pastorale', 'Éco-École', 'APEL', 'Sorties', 'Inscriptions']
export const NIVEAUX = [
  {title: 'Petite section', value: 'PS'},
  {title: 'Moyenne section', value: 'MS'},
  {title: 'Grande section', value: 'GS'},
  {title: 'CP', value: 'CP'},
  {title: 'CE1', value: 'CE1'},
  {title: 'CE2', value: 'CE2'},
  {title: 'CM1', value: 'CM1'},
  {title: 'CM2', value: 'CM2'},
]
export const PUBLICS = ["Familles de l'école", 'Futures familles', 'Tout public']

// Le build du site refuse le tiret cadratin : on l'arrête dès la saisie, avec la solution.
export const sansCadratin = (v?: string) =>
  v && v.includes('—') ? 'Remplacez le tiret long par une virgule ou deux-points.' : true

export const TELEPHONE = /^0[1-9]( ?[0-9]{2}){4}$/
export const telephoneValide = (v?: string) =>
  !v || TELEPHONE.test(v.trim()) ? true : 'Numéro à 10 chiffres, par exemple 02 40 46 27 13.'

const fmt = new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris'})
export const dateLisible = (d?: string) => (d ? fmt.format(new Date(d.length === 10 ? `${d}T12:00:00` : d)) : '')
