<?php

it('pins php 85 and the voice processor without an implicit php fallback', function () {
    $runtime = file_get_contents(dirname(__DIR__, 2).'/nixpacks.toml');
    expect($runtime)->toContain('php85.withExtensions')
        ->toContain('php85Packages.composer')
        ->toContain('PHP_MINOR_VERSION === 5')
        ->toContain('mkdir -p /var/log/nginx /var/cache/nginx')
        ->toContain('"ffmpeg"')
        ->not->toContain('composer install --ignore-platform-reqs')
        ->not->toContain('nixPkgs = ["..."');
});

it('streams production process logs to the container output', function () {
    $runtime = file_get_contents(dirname(__DIR__, 2).'/nixpacks.toml');

    expect($runtime)
        ->not->toBeFalse()
        ->not->toMatch('~(?:logfile|access_log|error_log)\s*(?:=|\s)\s*/var/log/~')
        ->toContain('logfile=/dev/stdout')
        ->toContain('stdout_logfile=/dev/stdout')
        ->toContain('stdout_logfile_maxbytes=0')
        ->toContain('stderr_logfile=/dev/stderr')
        ->toContain('stderr_logfile_maxbytes=0')
        ->toContain('access_log /dev/stdout;')
        ->toContain('error_log /dev/stderr;');
});

it('keeps production workers within the vps memory budget', function () {
    $runtime = file_get_contents(dirname(__DIR__, 2).'/nixpacks.toml');

    expect($runtime)
        ->not->toBeFalse()
        ->toContain('numprocs=2')
        ->toContain('pm.max_children = 16')
        ->toContain('pm.min_spare_servers = 2')
        ->toContain('pm.max_spare_servers = 6')
        ->toContain('pm.start_servers = 3')
        ->toContain('pm.max_requests = 500')
        ->toContain('worker_processes auto;')
        ->not->toContain('numprocs=12')
        ->not->toContain('pm.max_children = 50')
        ->not->toContain('pm.start_servers = 18');
});

it('accepts bounded fastcgi response headers without unbounded buffers', function () {
    $runtime = file_get_contents(dirname(__DIR__, 2).'/nixpacks.toml');

    expect($runtime)
        ->toContain('fastcgi_buffer_size 32k;')
        ->toContain('fastcgi_buffers 8 16k;')
        ->toContain('fastcgi_busy_buffers_size 64k;')
        ->not->toContain('fastcgi_buffer_size 8k;');
});
