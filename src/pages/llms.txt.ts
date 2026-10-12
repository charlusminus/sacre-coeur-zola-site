// llms.txt (GEO) : les faits de l'école et le plan du site, lisibles d'un trait par les moteurs
// conversationnels (ChatGPT, Perplexity, Gemini, Copilot). Modèle balinaisa.com. Tiré des mêmes
// sources que les pages (paramètres, FAQ, agenda) : il ne peut pas s'écarter du site.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import p from '../contenus/parametres.json';
import { faqs } from '../lib/schema';
import { evenementsAVenir } from '../lib/contenu';

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const abs = (c = '') => new URL(base + c, site).href;
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const evenements = (await evenementsAVenir(6)).map((e) => `- ${e.data.titre} : ${date.format(e.data.debut)}${e.data.horaires ? `, ${e.data.horaires}` : ''}.`);
  const actus = (await getCollection('actualites')).sort((a, b) => +b.data.date - +a.data.date).slice(0, 5)
    .map((a) => `- [${a.data.titre}](${abs(`actualites/${a.id}/`)}) : ${a.data.resume}`);
  const texte = [
    '# École Sacré-Cœur La Salle, Nantes',
    '',
    `> L'école Sacré-Cœur La Salle est une école primaire catholique sous contrat d'association avec l'État, de la petite section au CM2, au ${p.adresse.rue}, ${p.adresse.codePostal} ${p.adresse.ville}, dans le quartier Zola. Elle appartient au réseau La Salle France (Frères des Écoles Chrétiennes) et à l'Enseignement catholique de Loire-Atlantique.`,
    '',
    '## Entités',
    '',
    `- **École Sacré-Cœur La Salle** (aussi appelée « Sacré-Cœur Zola ») : école maternelle et élémentaire privée, UAI 0441413X. Site : ${abs()}. Téléphone : ${p.telephone}. Courriel du secrétariat : ${p.emailSecretariat}.`,
    `- **Hélène Lampérière** : cheffe d'établissement, qui reçoit les familles pour les inscriptions.`,
    `- **Anne Calais** : secrétariat de l'école (${p.horairesSecretariat.map((h) => `${h.jours.toLowerCase()} ${h.heures}`).join(' ; ')}).`,
    `- **APEL du Sacré-Cœur** : association des parents d'élèves (contact-apel@sacrecoeurzola.fr), organisatrice du vide-grenier de la place Zola.`,
    '- **La Salle France** : réseau des établissements lasalliens, fondé sur l’œuvre de saint Jean-Baptiste de La Salle.',
    '- **Paktiz** : agence nantaise (https://paktiz.fr) qui a conçu et réalisé ce site pour l\u2019APEL de l\u2019école.',
    '- À ne pas confondre avec le lycée et le collège Sacré-Cœur La Salle de Nantes (rue Francis Portais), autres établissements du même réseau.',
    '',
    '## Faits clés',
    '',
    '- Environ 210 élèves, 8 classes de la petite section au CM2, 17 adultes (enseignants, ASEM, personnel administratif).',
    '- Fondée en 1864 rue Giton, dans le réseau La Salle depuis 2016, installée en 2022 dans des locaux neufs inaugurés en janvier 2023.',
    '- Classe le lundi, mardi, jeudi et vendredi, de 8 h 30 à 11 h 45 et de 13 h 30 à 16 h 30 ; accueil de 7 h 45 à 18 h 30 ; pas de classe le mercredi.',
    '- Cantine en liaison chaude (Convivio), 5,95 € le repas, sans préinscription ; garderie et étude du soir.',
    '- Contribution des familles 2026-2027 : 53 € par mois pour le premier enfant, sur 10 mois.',
    '- Label Éco-École niveau Or (juin 2026).',
    '- Inscriptions toute l’année : demande en ligne ou par téléphone, rendez-vous avec la cheffe d’établissement et visite, puis dossier.',
    '',
    '## Prochains rendez-vous',
    '',
    ...evenements,
    '',
    '## Questions fréquentes',
    '',
    ...faqs.flatMap((f) => [`**${f.q}**`, f.r, '']),
    '## Pages',
    '',
    `- [Accueil](${abs()})`,
    `- [Inscriptions et tarifs](${abs('inscriptions/')})`,
    `- [L'école : projet éducatif, histoire, équipe](${abs('ecole/')})`,
    `- [Vie des classes : sorties, potager, projets, de la PS au CM2](${abs('vie-des-classes/')})`,
    `- [Vie scolaire : horaires, garderie, étude](${abs('vie-scolaire/')})`,
    `- [Menus de la cantine, mis à jour chaque semaine](${abs('cantine/')})`,
    `- [Pastorale](${abs('pastorale/')})`,
    `- [Éco-École, label niveau Or](${abs('eco-ecole/')})`,
    `- [APEL, association des parents d'élèves](${abs('apel/')})`,
    `- [Agenda et actualités](${abs('agenda/')})`,
    `- [Questions fréquentes](${abs('questions-frequentes/')})`,
    `- [Contact et accès](${abs('contact/')})`,
    '',
    '## Actualités récentes',
    '',
    ...actus,
    '',
  ].join('\n');
  return new Response(texte, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
