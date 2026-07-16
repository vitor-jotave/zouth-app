<?php

it('streams production process logs to the container output', function () {
    $runtime = file_get_contents(dirname(__DIR__, 2).'/nixpacks.toml');

    expect($runtime)
        ->not->toBeFalse()
        ->not->toContain('/var/log/')
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
