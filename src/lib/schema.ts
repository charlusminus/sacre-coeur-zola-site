// Données structurées schema.org (SEO local et GEO). Un graphe par page : le site, l'école (même @id
// partout), le fil d'Ariane, puis les nœuds propres à la page (FAQ, événements, article).
import p from '../contenus/parametres.json';
import faq from '../contenus/faq.json';

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const absolu = (site: URL | undefined, chemin = '') => new URL(base + chemin.replace(/^\//, ''), site).href;
export const idEcole = (site: URL | undefined) => absolu(site) + '#ecole';

export function website(site: URL | undefined) {
  return {
    '@type': 'WebSite',
    '@id': absolu(site) + '#site',
    url: absolu(site),
    name: `${p.nom}, ${p.ville}`,
    alternateName: ['École Sacré-Cœur Zola', 'Sacré-Cœur La Salle Nantes', 'École Sacré Coeur La Salle Nantes', 'sacrecoeurzola'],
    inLanguage: 'fr-FR',
    publisher: { '@id': idEcole(site) },
    creator: { '@type': 'Organization', name: 'Paktiz', url: 'https://paktiz.fr/' },
  };
}

export function ecole(site: URL | undefined) {
  const jours: Record<string, string[]> = { 'Lundi et vendredi': ['Monday', 'Friday'], Mardi: ['Tuesday'] };
  return {
    '@type': ['ElementarySchool', 'Preschool'],
    '@id': idEcole(site),
    name: `${p.nom}, ${p.ville}`,
    alternateName: ['École Sacré-Cœur Zola', 'École primaire privée Sacré-Cœur La Salle'],
    description: 'École catholique sous contrat d’association, de la petite section au CM2, dans le quartier Zola à Nantes. Réseau La Salle France.',
    url: absolu(site),
    logo: absolu(site, 'icone-512.png'),
    image: absolu(site, 'partage.jpg'),
    telephone: '+33' + p.telephone.replace(/\s/g, '').slice(1),
    email: p.emailSecretariat,
    foundingDate: '1864',
    address: { '@type': 'PostalAddress', streetAddress: p.adresse.rue, postalCode: p.adresse.codePostal, addressLocality: p.adresse.ville, addressRegion: 'Pays de la Loire', addressCountry: 'FR' },
    geo: { '@type': 'GeoCoordinates', latitude: p.geo.latitude, longitude: p.geo.longitude },
    areaServed: [{ '@type': 'Place', name: 'Quartier Zola, Nantes' }, { '@type': 'City', name: 'Nantes' }],
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Thursday', 'Friday'], opens: '07:45', closes: '18:30' },
    ],
    contactPoint: p.horairesSecretariat.map((h) => ({
      '@type': 'ContactPoint', contactType: 'secrétariat et inscriptions', telephone: '+33' + p.telephone.replace(/\s/g, '').slice(1),
      email: p.emailSecretariat, availableLanguage: 'fr', hoursAvailable: { '@type': 'OpeningHoursSpecification', dayOfWeek: jours[h.jours] ?? [], description: h.heures },
    })),
    memberOf: [
      { '@type': 'Organization', name: 'La Salle France', url: 'https://lasallefrance.fr/' },
      { '@type': 'Organization', name: 'Enseignement catholique de Loire-Atlantique', url: 'https://www.ec44.fr/' },
    ],
    identifier: { '@type': 'PropertyValue', propertyID: 'UAI', value: '0441413X' },
    sameAs: [p.instagram],
  };
}

export function filAriane(site: URL | undefined, items: { nom: string; href?: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ nom: 'Accueil', href: '' }, ...items].map((i, n) => ({
      '@type': 'ListItem', position: n + 1, name: i.nom, ...(i.href !== undefined && { item: absolu(site, i.href) }),
    })),
  };
}

export function pageFaq(questions = faq) {
  return {
    '@type': 'FAQPage',
    mainEntity: questions.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })),
  };
}

export const faqs = faq;
