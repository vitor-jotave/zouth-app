<?php

use App\Support\ProductVideo;

it('normalizes supported product video links', function (
    string $url,
    string $provider,
    string $normalizedUrl,
    string $embedUrl,
) {
    $video = ProductVideo::fromUrl($url);

    expect($video)
        ->not->toBeNull()
        ->and($video?->provider)->toBe($provider)
        ->and($video?->url)->toBe($normalizedUrl)
        ->and($video?->embedUrl)->toBe($embedUrl);
})->with([
    'youtube watch' => [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'youtube',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    ],
    'youtube short link' => [
        'https://youtu.be/dQw4w9WgXcQ?t=10',
        'youtube',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    ],
    'youtube shorts' => [
        'https://youtube.com/shorts/dQw4w9WgXcQ',
        'youtube',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    ],
    'vimeo' => [
        'https://vimeo.com/76979871',
        'vimeo',
        'https://vimeo.com/76979871',
        'https://player.vimeo.com/video/76979871',
    ],
    'dailymotion' => [
        'https://www.dailymotion.com/video/x84sh87',
        'dailymotion',
        'https://www.dailymotion.com/video/x84sh87',
        'https://www.dailymotion.com/embed/video/x84sh87',
    ],
    'loom' => [
        'https://www.loom.com/share/1234567890abcdef',
        'loom',
        'https://www.loom.com/share/1234567890abcdef',
        'https://www.loom.com/embed/1234567890abcdef',
    ],
    'direct video' => [
        'https://cdn.example.com/collection/lookbook.mp4',
        'direct',
        'https://cdn.example.com/collection/lookbook.mp4',
        'https://cdn.example.com/collection/lookbook.mp4',
    ],
]);

it('rejects unsupported or unsafe product video links', function (string $url) {
    expect(ProductVideo::fromUrl($url))->toBeNull();
})->with([
    'plain text' => 'video bonito',
    'unsupported page' => 'https://example.com/video',
    'insecure direct file' => 'http://example.com/video.mp4',
    'invalid youtube id' => 'https://youtube.com/watch?v=bad',
    'credentials in url' => 'https://user:password@youtube.com/watch?v=dQw4w9WgXcQ',
]);
