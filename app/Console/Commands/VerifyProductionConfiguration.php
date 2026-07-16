<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class VerifyProductionConfiguration extends Command
{
    protected $signature = 'app:verify-production {--skip-connectivity : Validate configuration without connecting to dependencies}';

    protected $description = 'Fail when the production environment is incomplete or unsafe';

    public function handle(): int
    {
        $failures = collect($this->configurationChecks())
            ->filter(fn (array $check): bool => ! $check['valid'])
            ->map(fn (array $check, string $name): array => [$name, $check['message']])
            ->values();

        if (! $this->option('skip-connectivity')) {
            $failures = $failures->merge($this->connectivityFailures());
        }

        if ($failures->isNotEmpty()) {
            $this->error('A configuracao de producao nao esta pronta.');
            $this->table(['Configuracao', 'Correcao necessaria'], $failures->all());

            return self::FAILURE;
        }

        $this->info('Configuracao de producao validada com sucesso.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, array{valid: bool, message: string}>
     */
    private function configurationChecks(): array
    {
        $appUrl = (string) config('app.url');
        $evolutionUrl = (string) config('evolution.url');
        $evolutionWebhookUrl = (string) config('evolution.webhook_url');
        $salesContactUrl = config('commercial.sales_contact_url');
        $privacyEmail = config('commercial.privacy_email');

        return [
            'APP_ENV' => $this->check(config('app.env') === 'production', 'Defina APP_ENV=production.'),
            'APP_DEBUG' => $this->check(config('app.debug') === false, 'Defina APP_DEBUG=false.'),
            'APP_KEY' => $this->check(filled(config('app.key')), 'Gere e configure APP_KEY.'),
            'APP_URL' => $this->check($this->isHttpsUrl($appUrl), 'Use uma APP_URL publica com HTTPS.'),
            'LOG_CHANNEL' => $this->check($this->logsToStandardError(), 'Direcione os logs para stderr ou para uma stack que inclua stderr.'),
            'TRUSTED_HOSTS' => $this->check(config('app.trusted_hosts') !== [], 'Configure ao menos um host permitido.'),
            'TRUSTED_PROXIES' => $this->check(filled(config('trustedproxy.proxies')), 'Configure os proxies reversos permitidos.'),
            'DB_CONNECTION' => $this->check(config('database.default') !== 'sqlite', 'Use PostgreSQL ou outro banco persistente.'),
            'CACHE_STORE' => $this->check(! in_array(config('cache.default'), ['array', 'null'], true), 'Use cache persistente.'),
            'QUEUE_CONNECTION' => $this->check(! in_array(config('queue.default'), ['sync', 'null'], true), 'Use uma fila assincrona persistente.'),
            'SESSION_DRIVER' => $this->check(! in_array(config('session.driver'), ['array', 'file'], true), 'Use sessoes persistentes compartilhadas.'),
            'SESSION_SECURE_COOKIE' => $this->check(config('session.secure') === true, 'Defina SESSION_SECURE_COOKIE=true.'),
            'SESSION_ENCRYPT' => $this->check(config('session.encrypt') === true, 'Defina SESSION_ENCRYPT=true.'),
            'MAIL_MAILER' => $this->check(! in_array(config('mail.default'), ['array', 'log'], true), 'Configure um provedor real de e-mail.'),
            'MAIL_FROM_ADDRESS' => $this->check(
                $this->isValidEmail(config('mail.from.address')) && config('mail.from.address') !== 'hello@example.com',
                'Configure um remetente real.'
            ),
            'SALES_CONTACT_URL' => $this->check(
                $this->isCommercialContactUrl($salesContactUrl),
                'Configure um contato comercial HTTPS ou mailto valido.'
            ),
            'PRIVACY_CONTACT_EMAIL' => $this->check(
                $this->isValidEmail($privacyEmail),
                'Configure um e-mail valido para privacidade e LGPD.'
            ),
            'FILESYSTEM_DISK' => $this->check(config('filesystems.default') === 's3', 'Use FILESYSTEM_DISK=s3 para midia persistente.'),
            'CATALOG_MEDIA_DISK' => $this->check(config('filesystems.catalog_media_disk') === 's3', 'Use CATALOG_MEDIA_DISK=s3.'),
            'AWS_ACCESS_KEY_ID' => $this->check(filled(config('filesystems.disks.s3.key')), 'Configure a chave do R2/S3.'),
            'AWS_SECRET_ACCESS_KEY' => $this->check(filled(config('filesystems.disks.s3.secret')), 'Configure o segredo do R2/S3.'),
            'AWS_BUCKET' => $this->check(filled(config('filesystems.disks.s3.bucket')), 'Configure o bucket do R2/S3.'),
            'AWS_URL' => $this->check($this->isHttpsUrl(config('filesystems.disks.s3.url')), 'Configure a URL publica HTTPS da CDN.'),
            'AWS_ENDPOINT' => $this->check($this->isHttpsUrl(config('filesystems.disks.s3.endpoint')), 'Configure o endpoint HTTPS do R2/S3.'),
            'STRIPE_KEY' => $this->check(
                $this->isLiveStripeKey(config('cashier.key'), 'pk_live_'),
                'Configure uma chave publicavel Stripe live (pk_live_).'
            ),
            'STRIPE_SECRET' => $this->check(
                $this->isLiveStripeKey(config('cashier.secret'), 'sk_live_'),
                'Configure uma chave secreta Stripe live (sk_live_).'
            ),
            'STRIPE_WEBHOOK_SECRET' => $this->check(
                $this->hasPrefixedValue(config('cashier.webhook.secret'), 'whsec_'),
                'Configure um STRIPE_WEBHOOK_SECRET valido (whsec_).'
            ),
            'EVOLUTION_API_URL' => $this->check($this->isHttpsUrl($evolutionUrl), 'Configure a URL HTTPS da Evolution API.'),
            'EVOLUTION_API_KEY' => $this->check(filled(config('evolution.api_key')), 'Configure a chave da Evolution API.'),
            'EVOLUTION_WEBHOOK_URL' => $this->check($this->isHttpsUrl($evolutionWebhookUrl), 'Configure a URL HTTPS publica do webhook.'),
        ];
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    private function connectivityFailures(): array
    {
        $failures = [];

        try {
            DB::select('select 1');
        } catch (Throwable) {
            $failures[] = ['DATABASE', 'O banco de dados nao respondeu.'];
        }

        $key = 'production-verification:'.bin2hex(random_bytes(8));

        try {
            Cache::put($key, 'ready', 10);

            if (Cache::get($key) !== 'ready') {
                $failures[] = ['CACHE', 'O cache nao persistiu o valor de verificacao.'];
            }
        } catch (Throwable) {
            $failures[] = ['CACHE', 'O cache nao respondeu.'];
        } finally {
            try {
                Cache::forget($key);
            } catch (Throwable) {
                // The result above already reports the dependency failure.
            }
        }

        return $failures;
    }

    /**
     * @return array{valid: bool, message: string}
     */
    private function check(bool $valid, string $message): array
    {
        return compact('valid', 'message');
    }

    private function isHttpsUrl(mixed $url): bool
    {
        return is_string($url)
            && filter_var($url, FILTER_VALIDATE_URL) !== false
            && parse_url($url, PHP_URL_SCHEME) === 'https'
            && filled(parse_url($url, PHP_URL_HOST));
    }

    private function isLiveStripeKey(mixed $key, string $prefix): bool
    {
        return $this->hasPrefixedValue($key, $prefix);
    }

    private function hasPrefixedValue(mixed $value, string $prefix): bool
    {
        return is_string($value)
            && str_starts_with($value, $prefix)
            && strlen($value) > strlen($prefix);
    }

    private function isValidEmail(mixed $email): bool
    {
        return is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function isCommercialContactUrl(mixed $url): bool
    {
        if ($this->isHttpsUrl($url)) {
            return true;
        }

        if (! is_string($url) || ! str_starts_with($url, 'mailto:')) {
            return false;
        }

        return $this->isValidEmail(parse_url($url, PHP_URL_PATH));
    }

    private function logsToStandardError(): bool
    {
        $defaultChannel = config('logging.default');

        if ($defaultChannel === 'stderr') {
            return true;
        }

        if ($defaultChannel !== 'stack') {
            return false;
        }

        $stackChannels = config('logging.channels.stack.channels', []);

        return is_array($stackChannels) && in_array('stderr', $stackChannels, true);
    }
}
