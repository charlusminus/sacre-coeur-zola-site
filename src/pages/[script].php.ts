// Envoi des demandes d'inscription par e-mail, par l'hébergement OVH de l'école (PHP mail()).
// Généré seulement quand PUBLIC_FORMULAIRE=php (site en ligne) ; la démo sur GitHub Pages, sans
// PHP, garde une confirmation simulée. Rien n'est stocké sur le serveur : la demande part par
// e-mail aux adresses choisies dans Sanity (Informations générales > Inscriptions).
import type { APIRoute } from 'astro';
import { parametres as p } from '../lib/donnees';

export function getStaticPaths() {
  return import.meta.env.PUBLIC_FORMULAIRE === 'php' ? [{ params: { script: 'envoi-demande' } }] : [];
}

const chaine = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const destinataires = (p.destinatairesDemandes?.length ? p.destinatairesDemandes : [p.emailSecretariat])
  .filter((a) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i.test(a));
const telephone = p.telephone;

export const GET: APIRoute = () => new Response(`<?php
// Fichier généré au build (src/pages/[script].php.ts) : ne pas le modifier sur le serveur.
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

const DESTINATAIRES = [${destinataires.map(chaine).join(', ')}];
const EXPEDITEUR = 'ne-pas-repondre@sacrecoeurzola.fr';
const NOM_EXPEDITEUR = 'Site de l\\'école Sacré-Cœur La Salle';
const TELEPHONE = ${chaine(telephone)};

function repondre(int $code, array $donnees): void {
  http_response_code($code);
  echo json_encode($donnees, JSON_UNESCAPED_UNICODE);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') repondre(405, ['ok' => false]);

// Même site seulement (pas d'envoi depuis une autre page).
$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
$hote = parse_url($origine, PHP_URL_HOST) . (parse_url($origine, PHP_URL_PORT) ? ':' . parse_url($origine, PHP_URL_PORT) : '');
if ($origine !== '' && $hote !== ($_SERVER['HTTP_HOST'] ?? '')) repondre(403, ['ok' => false]);

// Robots : champ piège rempli, ou formulaire envoyé moins de 3 secondes après l'ouverture de la
// page. On répond « envoyé » sans rien envoyer.
$debut = (int) ($_POST['debut'] ?? 0);
if (!empty($_POST['site_web']) || ($debut > 0 && (int) (microtime(true) * 1000) - $debut < 3000)) repondre(200, ['ok' => true]);

// Au plus 5 demandes par heure et par adresse IP.
$trace = sys_get_temp_dir() . '/demandes-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __FILE__);
$recents = array_filter(array_map('intval', @file($trace, FILE_IGNORE_NEW_LINES) ?: []), fn ($t) => $t > time() - 3600);
if (count($recents) >= 5) repondre(429, ['ok' => false, 'message' => 'Trop de demandes envoyées. Appelez-nous au ' . TELEPHONE . '.']);

$ligne = fn (string $k, int $max): string => trim(mb_substr(preg_replace('/[\\r\\n\\t]+/u', ' ', (string) ($_POST[$k] ?? '')), 0, $max));
$d = [
  'parent' => $ligne('parent', 120),
  'telephone' => $ligne('telephone', 30),
  'email' => $ligne('email', 160),
  'enfant' => $ligne('enfant', 80),
  'naissance' => $ligne('naissance', 10),
  'rentree' => $ligne('rentree', 60),
  'classe' => $ligne('classe', 40),
];
$message = trim(mb_substr(str_replace("\\r", '', (string) ($_POST['message'] ?? '')), 0, 2000));

$erreurs = [];
foreach (['parent', 'telephone', 'enfant', 'rentree', 'classe'] as $k) if ($d[$k] === '') $erreurs[] = $k;
if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $erreurs[] = 'email';
if (!preg_match('/^[0-9]{2}\\/[0-9]{2}\\/[0-9]{4}$/', $d['naissance'])) $erreurs[] = 'naissance';
if ($erreurs) repondre(422, ['ok' => false, 'champs' => $erreurs]);

$sujet = "Demande d'inscription : {$d['enfant']}, {$d['classe']} ({$d['rentree']})";
$corps = "Nouvelle demande d'inscription envoyée depuis le site de l'école.\\n\\n"
  . "Parent : {$d['parent']}\\n"
  . "Téléphone : {$d['telephone']}\\n"
  . "E-mail : {$d['email']}\\n\\n"
  . "Enfant : {$d['enfant']}\\n"
  . "Date de naissance : {$d['naissance']}\\n"
  . "Rentrée souhaitée : {$d['rentree']}\\n"
  . "Classe : {$d['classe']}\\n\\n"
  . ($message !== '' ? "Message :\\n$message\\n\\n" : '')
  . "Répondre à ce message écrit directement à la famille.\\n"
  . "Envoyé le " . date('d/m/Y à H:i') . ". Ces informations ne sont conservées nulle part ailleurs que dans cette boîte : à supprimer un an au plus après l'inscription.\\n";

$entetes = implode("\\r\\n", [
  'From: ' . mb_encode_mimeheader(NOM_EXPEDITEUR, 'UTF-8') . ' <' . EXPEDITEUR . '>',
  'Reply-To: ' . mb_encode_mimeheader($d['parent'], 'UTF-8') . ' <' . $d['email'] . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: 8bit',
]);

$envoye = mail(implode(', ', DESTINATAIRES), mb_encode_mimeheader($sujet, 'UTF-8'), $corps, $entetes, '-f' . EXPEDITEUR);
if (!$envoye) repondre(500, ['ok' => false, 'message' => "L'envoi n'a pas abouti. Appelez-nous au " . TELEPHONE . '.']);
@file_put_contents($trace, implode("\\n", [...$recents, time()]));
repondre(200, ['ok' => true]);
`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
