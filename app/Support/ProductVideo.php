<?php

namespace App\Support;

final readonly class ProductVideo
{
    private const DIRECT_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v'];

    private function __construct(
        public string $provider,
        public string $kind,
        public string $url,
        public string $embedUrl,
    ) {}

    public static function fromUrl(?string $url): ?self
    {
        $url = trim((string) $url);

        if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));

        if (! in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['user'], $parts['pass'])) {
            return null;
        }

        $host = str_starts_with($host, 'www.') ? substr($host, 4) : $host;
        $path = '/'.ltrim((string) ($parts['path'] ?? ''), '/');

        if (in_array($host, ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'youtu.be'], true)) {
            return self::youtube($host, $path, $parts);
        }

        if ($host === 'vimeo.com' || str_ends_with($host, '.vimeo.com')) {
            return self::vimeo($path);
        }

        if (in_array($host, ['dailymotion.com', 'dai.ly'], true)) {
            return self::dailymotion($host, $path);
        }

        if ($host === 'loom.com' || str_ends_with($host, '.loom.com')) {
            return self::loom($path);
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if ($scheme === 'https' && in_array($extension, self::DIRECT_EXTENSIONS, true)) {
            return new self('direct', 'file', $url, $url);
        }

        return null;
    }

    /**
     * @return array{provider: string, kind: string, url: string, embed_url: string}
     */
    public function toArray(): array
    {
        return [
            'provider' => $this->provider,
            'kind' => $this->kind,
            'url' => $this->url,
            'embed_url' => $this->embedUrl,
        ];
    }

    /**
     * @param  array<string, mixed>  $parts
     */
    private static function youtube(string $host, string $path, array $parts): ?self
    {
        $segments = array_values(array_filter(explode('/', trim($path, '/'))));
        $videoId = null;

        if ($host === 'youtu.be') {
            $videoId = $segments[0] ?? null;
        } elseif (($segments[0] ?? null) === 'watch') {
            parse_str((string) ($parts['query'] ?? ''), $query);
            $videoId = $query['v'] ?? null;
        } elseif (in_array($segments[0] ?? null, ['embed', 'shorts', 'live'], true)) {
            $videoId = $segments[1] ?? null;
        }

        if (! is_string($videoId) || preg_match('/^[A-Za-z0-9_-]{6,20}$/', $videoId) !== 1) {
            return null;
        }

        return new self(
            'youtube',
            'embed',
            "https://www.youtube.com/watch?v={$videoId}",
            "https://www.youtube-nocookie.com/embed/{$videoId}?rel=0",
        );
    }

    private static function vimeo(string $path): ?self
    {
        $segments = array_values(array_filter(explode('/', trim($path, '/'))));
        $videoId = collect($segments)->last(fn (string $segment): bool => ctype_digit($segment));

        if (! is_string($videoId)) {
            return null;
        }

        return new self(
            'vimeo',
            'embed',
            "https://vimeo.com/{$videoId}",
            "https://player.vimeo.com/video/{$videoId}",
        );
    }

    private static function dailymotion(string $host, string $path): ?self
    {
        $segments = array_values(array_filter(explode('/', trim($path, '/'))));
        $videoId = $host === 'dai.ly'
            ? ($segments[0] ?? null)
            : (($segments[0] ?? null) === 'video' ? ($segments[1] ?? null) : null);

        if (! is_string($videoId) || preg_match('/^[A-Za-z0-9]+$/', $videoId) !== 1) {
            return null;
        }

        return new self(
            'dailymotion',
            'embed',
            "https://www.dailymotion.com/video/{$videoId}",
            "https://www.dailymotion.com/embed/video/{$videoId}",
        );
    }

    private static function loom(string $path): ?self
    {
        $segments = array_values(array_filter(explode('/', trim($path, '/'))));

        if (! in_array($segments[0] ?? null, ['share', 'embed'], true)) {
            return null;
        }

        $videoId = $segments[1] ?? null;

        if (! is_string($videoId) || preg_match('/^[A-Za-z0-9_-]{8,64}$/', $videoId) !== 1) {
            return null;
        }

        return new self(
            'loom',
            'embed',
            "https://www.loom.com/share/{$videoId}",
            "https://www.loom.com/embed/{$videoId}",
        );
    }
}
