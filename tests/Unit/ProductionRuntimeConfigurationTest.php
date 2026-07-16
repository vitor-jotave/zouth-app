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
