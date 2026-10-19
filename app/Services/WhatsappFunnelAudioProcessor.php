<?php

namespace App\Services;

use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Process\Exceptions\ProcessTimedOutException;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class WhatsappFunnelAudioProcessor
{
    /** @return array{media_path: string, file_name: string, mimetype: string} */
    public function store(UploadedFile $file, string $field): array
    {
        $temporaryPath = tempnam(sys_get_temp_dir(), 'zouth-voice-');

        if ($temporaryPath === false) {
            throw new \RuntimeException('Não foi possível preparar o áudio.');
        }

        try {
            $result = Process::timeout(45)->run([
                'ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
                '-protocol_whitelist', 'file,pipe', '-i', $file->getPathname(),
                '-map', '0:a:0', '-vn', '-map_metadata', '-1',
                '-c:a', 'libopus', '-application', 'voip', '-ac', '1',
                '-ar', '48000', '-b:a', '32k', '-f', 'ogg', $temporaryPath,
            ]);

            clearstatcache(true, $temporaryPath);

            if (! $result->successful() || filesize($temporaryPath) === 0 || filesize($temporaryPath) > 20 * 1024 * 1024) {
                throw ValidationException::withMessages([
                    $field => 'Não foi possível processar este áudio. Envie um arquivo de áudio válido de até 20 MB.',
                ]);
            }

            $path = Storage::disk('s3')->putFileAs(
                'whatsapp-funnels/audio', new File($temporaryPath), Str::uuid().'.ogg',
            );

            if ($path === false) {
                throw new \RuntimeException('Não foi possível salvar o áudio. Tente novamente.');
            }

            return [
                'media_path' => $path,
                'file_name' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME).'.ogg',
                'mimetype' => 'audio/ogg',
            ];
        } catch (ProcessTimedOutException) {
            throw ValidationException::withMessages([
                $field => 'Este áudio demorou demais para processar. Envie um arquivo menor e tente novamente.',
            ]);
        } finally {
            unlink($temporaryPath);
        }
    }
}
