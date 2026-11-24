<?php

namespace App\Http\Controllers;

use App\Services\ImageThumbnailService;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class ImageThumbnailController extends Controller
{
    private const CACHE_SECONDS = 2592000;

    /**
     * GET /thumbs/{width}/{path}.webp, where {path} is relative to the public disk (storage/app/public).
     * Only reached the first time (afterwards the web server serves public/thumbs/... directly).
     * Unusable sources redirect to the original image so nothing breaks.
     */
    public function __invoke(ImageThumbnailService $thumbnails, int $width, string $path): Response|RedirectResponse
    {
        $sourcePath = (string) preg_replace('/\.webp$/i', '', $path);
        $thumbnailPath = $thumbnails->thumbnailPath($sourcePath, $width);

        if ($thumbnailPath === null) {
            abort_unless($thumbnails->sourceExists($sourcePath), 404);

            return redirect()->to(asset('storage/'.ltrim($sourcePath, '/')));
        }

        return $thumbnails->thumbsDisk()->response($thumbnailPath, null, [
            'Content-Type' => 'image/webp',
            'Cache-Control' => 'public, max-age='.self::CACHE_SECONDS,
        ]);
    }
}
