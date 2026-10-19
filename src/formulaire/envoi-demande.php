<?php
// Envoi des demandes d'inscription par e-mail, sur l'hébergement OVH de l'école (PHP mail()).
// Modèle : src/formulaire/envoi-demande.php. Le build (src/pages/[script].php.ts) remplace les
// valeurs entre doubles soulignés par celles du back-office. Ne pas modifier le fichier publié.
declare(strict_types=1);
date_default_timezone_set('Europe/Paris');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

const DESTINATAIRES = __DESTINATAIRES__;
const COPIE_CACHEE = __COPIE_CACHEE__;
const EXPEDITEUR = 'ne-pas-repondre@sacrecoeurzola.fr';
const NOM_EXPEDITEUR = "Site de l'école Sacré-Cœur La Salle";
const TELEPHONE = __TELEPHONE__;

function repondre(int $code, array $donnees): void
{
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

$ligne = fn (string $k, int $max): string => trim(mb_substr(preg_replace('/[\r\n\t]+/u', ' ', (string) ($_POST[$k] ?? '')), 0, $max));
$d = [
    'parent' => $ligne('parent', 120),
    'telephone' => $ligne('telephone', 30),
    'email' => $ligne('email', 160),
    'enfant' => $ligne('enfant', 80),
    'naissance' => $ligne('naissance', 10),
    'rentree' => $ligne('rentree', 60),
    'classe' => $ligne('classe', 40),
];
$message = trim(mb_substr(str_replace("\r", '', (string) ($_POST['message'] ?? '')), 0, 2000));

$erreurs = [];
foreach (['parent', 'telephone', 'enfant', 'rentree', 'classe'] as $k) if ($d[$k] === '') $erreurs[] = $k;
if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL)) $erreurs[] = 'email';
if (!preg_match('/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/', $d['naissance'])) $erreurs[] = 'naissance';
if ($erreurs) repondre(422, ['ok' => false, 'champs' => $erreurs]);

// Le message : un objet qui dit tout, une version mise en forme et une version texte.
$quand = date('d/m/Y') . ' à ' . date('H') . ' h ' . date('i');
$sujet = "Demande d'inscription : {$d['enfant']}, {$d['classe']}, {$d['rentree']}";
$telLien = 'tel:' . preg_replace('/[^0-9+]/', '', $d['telephone']);
$repondreLien = 'mailto:' . rawurlencode($d['email']) . '?subject=' . rawurlencode("Votre demande d'inscription à l'école Sacré-Cœur La Salle");
$sections = [
    'La famille' => [['Parent', $d['parent']], ['Téléphone', $d['telephone'], $telLien], ['E-mail', $d['email'], 'mailto:' . $d['email']]],
    "L'enfant" => [['Prénom', $d['enfant']], ['Né(e) le', $d['naissance']], ['Classe demandée', $d['classe']], ['Rentrée', $d['rentree']]],
];

$texte = "Nouvelle demande d'inscription reçue par le site de l'école, le $quand.\n\n";
foreach ($sections as $titre => $rangs) {
    $texte .= mb_strtoupper($titre) . "\n";
    foreach ($rangs as $r) $texte .= "{$r[0]} : {$r[1]}\n";
    $texte .= "\n";
}
if ($message !== '') $texte .= "LE MOT DE LA FAMILLE\n$message\n\n";
$texte .= "Pour répondre à la famille, utilisez simplement « Répondre ».\n"
    . "Ces informations sont à conserver un an au plus après l'inscription, puis à supprimer.\n";

$h = fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$police = "font-family:Arial,Helvetica,sans-serif";
$html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' . $h($sujet) . '</title></head>'
    . '<body style="margin:0;padding:0;background:#f6f3ee">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee"><tr><td align="center" style="padding:24px 12px">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;' . $police . '">'
    . '<tr><td style="height:6px;background:#C82A59;font-size:0;line-height:0">&nbsp;</td></tr>'
    . '<tr><td style="padding:28px 28px 8px">'
    . '<p style="margin:0 0 6px;font-size:13px;color:#5f5a52">Demande d\'inscription reçue le ' . $h($quand) . '</p>'
    . '<h1 style="margin:0;font-size:24px;line-height:1.25;color:#1d1b18">' . $h($d['enfant']) . ', ' . $h(mb_strtolower($d['classe'])) . '</h1>'
    . '<p style="margin:6px 0 0;font-size:16px;color:#1d1b18">Rentrée souhaitée : ' . $h($d['rentree']) . '</p>'
    . '</td></tr>'
    . '<tr><td style="padding:16px 28px 4px">'
    . '<a href="' . $h($telLien) . '" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:999px;background:#C82A59;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">Appeler ' . $h($d['parent']) . '</a>'
    . '<a href="' . $h($repondreLien) . '" style="display:inline-block;margin:0 0 8px;padding:10px 18px;border-radius:999px;border:2px solid #006BA8;color:#006BA8;font-size:15px;font-weight:bold;text-decoration:none">Répondre par e-mail</a>'
    . '</td></tr>';
foreach ($sections as $titre => $rangs) {
    $html .= '<tr><td style="padding:16px 28px 0"><h2 style="margin:0 0 8px;padding-top:14px;border-top:1px solid #ebe6de;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#5f5a52">' . $h($titre) . '</h2>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">';
    foreach ($rangs as $r) {
        $valeur = isset($r[2]) ? '<a href="' . $h($r[2]) . '" style="color:#006BA8;text-decoration:underline">' . $h($r[1]) . '</a>' : $h($r[1]);
        $html .= '<tr><td style="width:38%;padding:5px 12px 5px 0;font-size:14px;color:#5f5a52;vertical-align:top">' . $h($r[0]) . '</td>'
            . '<td style="padding:5px 0;font-size:16px;color:#1d1b18;font-weight:bold;vertical-align:top">' . $valeur . '</td></tr>';
    }
    $html .= '</table></td></tr>';
}
if ($message !== '') {
    $html .= '<tr><td style="padding:16px 28px 0"><h2 style="margin:0 0 8px;padding-top:14px;border-top:1px solid #ebe6de;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#5f5a52">Le mot de la famille</h2>'
        . '<p style="margin:0;padding:12px 14px;background:#f6f3ee;border-radius:8px;font-size:16px;line-height:1.5;color:#1d1b18">' . nl2br($h($message)) . '</p></td></tr>';
}
$html .= '<tr><td style="padding:24px 28px 28px"><p style="margin:0;font-size:13px;line-height:1.5;color:#5f5a52">Pour répondre à la famille, utilisez simplement «&nbsp;Répondre&nbsp;» : votre message part à ' . $h($d['email']) . '.<br>'
    . 'Ces informations sont à conserver un an au plus après l\'inscription, puis à supprimer.</p></td></tr>'
    . '</table></td></tr></table></body></html>';

$frontiere = 'scls-' . bin2hex(random_bytes(12));
$partie = fn (string $type, string $contenu): string => "--$frontiere\r\nContent-Type: $type; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($contenu), 76, "\r\n");
$corps = $partie('text/plain', $texte) . $partie('text/html', $html) . "--$frontiere--\r\n";

$entetes = implode("\r\n", [
    ...(COPIE_CACHEE ? ['Bcc: ' . implode(', ', COPIE_CACHEE)] : []),
    'From: ' . mb_encode_mimeheader(NOM_EXPEDITEUR, 'UTF-8', 'B') . ' <' . EXPEDITEUR . '>',
    'Reply-To: ' . mb_encode_mimeheader($d['parent'], 'UTF-8', 'B') . ' <' . $d['email'] . '>',
    'MIME-Version: 1.0',
    "Content-Type: multipart/alternative; boundary=\"$frontiere\"",
]);

$envoye = mail(implode(', ', DESTINATAIRES), mb_encode_mimeheader($sujet, 'UTF-8', 'B'), $corps, $entetes, '-f' . EXPEDITEUR);
if (!$envoye) repondre(500, ['ok' => false, 'message' => "L'envoi n'a pas abouti. Appelez-nous au " . TELEPHONE . '.']);
@file_put_contents($trace, implode("\n", [...$recents, time()]));
repondre(200, ['ok' => true]);
