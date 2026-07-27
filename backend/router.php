<?php
// -----------------------------------------------------------------------------
// Dev router for:  php -S localhost:8080 router.php
//
// SECURITY — WHY THE CHECKS BELOW EXIST
//   `return false` hands the request to the PHP built-in server, which EXECUTES
//   .php files. The request URI is urldecode()d and concatenated onto __DIR__
//   with no normalisation, so without these checks an encoded ../ can escape
//   this directory and name any file on the volume, and any writable location
//   under here becomes an RCE target.
//
//   The avatar feature deliberately never writes a file, so it cannot feed this
//   bug — but the bug is independent of that feature, and the NEXT feature that
//   writes a file would re-open it. Hence this patch ships alongside.
//
//   backend/api/.htaccess is irrelevant here: `php -S` ignores .htaccess entirely.
// -----------------------------------------------------------------------------
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Reject the traversal alphabet outright, AFTER decoding — this is the only
// point at which the decoded form is visible. A NUL byte truncates paths in some
// C layers; a backslash is a directory separator on Windows.
if (strpos($uri, '..') !== false || strpos($uri, "\0") !== false || strpos($uri, '\\') !== false) {
    http_response_code(400);
    exit;
}

if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    // Containment assertion: the resolved target must be a DESCENDANT of this
    // directory. realpath() collapses symlinks, "." / ".." and 8.3 short names.
    //
    // The comparison normalises separators AND CASE because NTFS is
    // case-insensitive and realpath() returns backslashes on Windows — without
    // both normalisations this check silently passes on this platform, which is
    // exactly the failure mode that makes such assertions worthless.
    $normalise = static function (string $path): string {
        return rtrim(strtolower(str_replace('\\', '/', $path)), '/');
    };

    $root   = realpath(__DIR__);
    $target = realpath(__DIR__ . $uri);

    if ($root !== false && $target !== false
        && strpos($normalise($target), $normalise($root) . '/') === 0) {
        return false;
    }

    // Escaped the docroot: behave as if it simply does not exist.
    http_response_code(404);
    exit;
}

require __DIR__ . '/api/index.php';
