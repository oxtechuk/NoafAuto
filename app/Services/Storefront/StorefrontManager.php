<?php

declare(strict_types=1);

namespace App\Services\Storefront;

use Illuminate\Support\Facades\Cache;

/**
 * Bridges a separately built project frontend (e.g. resources/storefront)
 * into the Laravel SPA shell (resources/views/app.blade.php).
 *
 * The frontend's built index.html is parsed once (cached by file mtime) and
 * its asset tags (module scripts, stylesheets, font links, preloads) are
 * injected into the shell, so SEO meta, JSON-LD and tracking stay server-side.
 */
class StorefrontManager
{
    public function isActive(): bool
    {
        return (bool) config('sitekit.storefront.enabled') && is_file($this->indexPath());
    }

    public function indexPath(): string
    {
        return rtrim((string) config('sitekit.storefront.public_path'), '\\/').DIRECTORY_SEPARATOR.'index.html';
    }

    /**
     * Data passed to the SPA shell view, or null when the bundled store is used.
     *
     * @return array{head: string, body: string, root_id: string}|null
     */
    public function viewData(): ?array
    {
        if (! $this->isActive()) {
            return null;
        }

        $indexPath = $this->indexPath();
        $cacheKey = 'sitekit.storefront.assets.'.md5($indexPath.'|'.filemtime($indexPath));

        return Cache::rememberForever($cacheKey, fn (): array => $this->parse((string) file_get_contents($indexPath)));
    }

    /**
     * Extract the asset tags Laravel must inject from a built index.html.
     *
     * Kept:    <script>, <link> (stylesheet, modulepreload, preload, preconnect, fonts), <style>
     * Dropped: <meta charset/viewport>, <title>, <link rel="icon"> (rendered by the shell itself)
     *
     * @return array{head: string, body: string, root_id: string}
     */
    public function parse(string $html): array
    {
        $head = preg_match('#<head[^>]*>(.*?)</head>#is', $html, $headMatch) ? $headMatch[1] : '';
        $body = preg_match('#<body[^>]*>(.*?)</body>#is', $html, $bodyMatch) ? $bodyMatch[1] : '';

        $headTags = [];
        preg_match_all('#<script\b[^>]*>.*?</script>|<link\b[^>]*>|<style\b[^>]*>.*?</style>#is', $head, $matches);
        foreach ($matches[0] as $tag) {
            if (preg_match('#^<link\b#i', $tag) && preg_match('#\brel=["\']?(?:shortcut\s+)?icon\b#i', $tag)) {
                continue;
            }
            $headTags[] = trim($tag);
        }

        // Scripts placed in <body> by the build (rare with Vite, but supported).
        preg_match_all('#<script\b[^>]*>.*?</script>#is', $body, $bodyScripts);

        $rootId = preg_match('#<div\b[^>]*\bid=["\']([\w-]+)["\']#i', $body, $rootMatch) ? $rootMatch[1] : 'root';

        return [
            'head' => implode("\n    ", $headTags),
            'body' => implode("\n", array_map('trim', $bodyScripts[0])),
            'root_id' => $rootId,
        ];
    }
}
