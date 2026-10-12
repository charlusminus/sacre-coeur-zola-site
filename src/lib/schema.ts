// Données structurées schema.org de l'école (SEO local).
import p from '../contenus/parametres.json';
export function schemaEcole(site: URL | undefined, base: string) {
  const url = new URL(base, site).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'ElementarySchool',
    '@id': url + '#ecole',
    name: `${p.nom}, ${p.ville}`,
    url,
    logo: new URL(base + 'icone-512.png', site).href,
    telephone: '+33' + p.telephone.replace(/\s/g, '').slice(1),
    email: p.emailSecretariat,
    address: { '@type': 'PostalAddress', streetAddress: p.adresse.rue, postalCode: p.adresse.codePostal, addressLocality: p.adresse.ville, addressCountry: 'FR' },
    geo: { '@type': 'GeoCoordinates', latitude: p.geo.latitude, longitude: p.geo.longitude },
    sameAs: [p.instagram],
    parentOrganization: { '@type': 'Organization', name: 'La Salle France', url: 'https://lasallefrance.fr/' },
  };
}
