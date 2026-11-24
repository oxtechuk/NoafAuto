<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Resized WebP copies of public-disk images, generated on first request and stored on the
 * "thumbs" disk (public/thumbs/{width}/{source path}.webp). Later requests are served by the
 * web server as static files and never reach PHP.
 */
class ImageThumbnailService
{
    /** Allowed widths. A small fixed set keeps the number of files bounded. */
    public const WIDTHS = [320, 480, 768];

    public const QUALITY = 78;

    private const SOURCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function __construct(private readonly ImageOptimizerService $optimizer) {}

    /**
     * Path of the thumbnail on the public disk, generating it if needed.
     * Null when the source is not a usable image (caller falls back to the original).
     */
    public function thumbnailPath(string $sourcePath, int $width): ?string
    {
        $sourcePath = $this->normalize($sourcePath);

        if ($sourcePath === null || ! in_array($width, self::WIDTHS, true) || ! $this->disk()->exists($sourcePath)) {
            return null;
        }

        $target = "{$width}/{$sourcePath}.webp";

        if ($this->thumbsDisk()->exists($target)) {
            return $target;
        }

        $webp = $this->optimizer->convertToWebp($this->disk()->get($sourcePath), $width, self::QUALITY);

        if ($webp === null) {
            return null;
        }

        $this->thumbsDisk()->put($target, $webp);

        return $target;
    }

    /** Disk the paths returned by thumbnailPath() live on. */
    public function thumbsDisk(): Filesystem
    {
        return Storage::disk('thumbs');
    }

    public function sourceExists(string $sourcePath): bool
    {
        $sourcePath = $this->normalize($sourcePath);

        return $sourcePath !== null && $this->disk()->exists($sourcePath);
    }

    /** Relative, traversal-free image path inside the public disk, or null. */
    private function normalize(string $path): ?string
    {
        $path = ltrim(str_replace('\\', '/', rawurldecode($path)), '/');

        if ($path === '' || str_contains($path, "\0")) {
            return null;
        }

        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                return null;
            }
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, self::SOURCE_EXTENSIONS, true) ? $path : null;
    }

    private function disk(): Filesystem
    {
        return Storage::disk('public');
    }
}
