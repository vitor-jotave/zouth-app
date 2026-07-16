<?php

use Illuminate\Contracts\Queue\Job;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Log;

it('writes a critical structured log when a queued job fails permanently', function () {
    Log::spy();

    $job = Mockery::mock(Job::class);
    $job->shouldReceive('getQueue')->once()->andReturn('default');
    $job->shouldReceive('resolveName')->once()->andReturn('App\\Jobs\\ExampleJob');
    $exception = new RuntimeException('Queue failure');

    event(new JobFailed('database', $job, $exception));

    Log::shouldHaveReceived('critical')
        ->once()
        ->withArgs(fn (string $message, array $context): bool => $message === 'Queue job failed.'
            && $context['connection'] === 'database'
            && $context['queue'] === 'default'
            && $context['job'] === 'App\\Jobs\\ExampleJob'
            && $context['exception'] === $exception);
});
