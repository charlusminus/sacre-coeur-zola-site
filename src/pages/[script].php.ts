// Envoi des demandes d'inscription par e-mail (PHP sur l'hébergement OVH de l'école). Le code est
// dans src/formulaire/envoi-demande.php ; ici, on y inscrit les destinataires choisis dans le
// back-office (Informations générales > Inscriptions) et le téléphone de l'école. Généré seulement
// quand PUBLIC_FORMULAIRE=php : la démo sur GitHub Pages, sans PHP, garde une confirmation simulée.
import type { APIRoute } from 'astro';
import modele from '../formulaire/envoi-demande.php?raw';
import { parametres as p } from '../lib/donnees';

export function getStaticPaths() {
  return import.meta.env.PUBLIC_FORMULAIRE === 'php' ? [{ params: { script: 'envoi-demande' } }] : [];
}

const chaine = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const destinataires = (p.destinatairesDemandes?.length ? p.destinatairesDemandes : [p.emailSecretariat])
  .filter((a) => /^[^\s@,;<>'"]+@[^\s@,;<>'"]+\.[a-z]{2,}$/i.test(a));

export const GET: APIRoute = () => {
  const code = modele
    .replace('__DESTINATAIRES__', `[${destinataires.map(chaine).join(', ')}]`)
    .replace('__TELEPHONE__', chaine(p.telephone));
  return new Response(code, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
