<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Process\Exceptions\ProcessTimedOutException;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class WhatsappChatAttachment
{
    private const IMAGES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    private const DOCUMENTS = [
        'application/pdf' => 'pdf',
        'text/plain' => 'txt',
        'text/csv' => 'csv',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'application/vnd.ms-powerpoint' => 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
    ];

    public function __construct(private WhatsappFunnelAudioProcessor $audio) {}

    /** @return array{path: string, type: string, mime: string, name: string} */
    public function store(UploadedFile $file, int $manufacturerId, bool $recorded): array
    {
        $mime = $file->getMimeType() ?? '';
        $directory = "whatsapp-chat/{$manufacturerId}";
        $name = preg_replace('/\p{C}/u', '-', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?? '';
        $name = Str::limit(trim($name), 120, '') ?: 'Anexo';

        if (str_starts_with($mime, 'audio/') || $mime === 'application/ogg') {
            return $this->storeAudio($file, $directory, $recorded ? 'Mensagem de voz' : $name);
        }

        if (in_array($mime, ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'], true)) {
            $streams = $this->streams($file);
            if (! in_array('video', $streams, true) && in_array('audio', $streams, true)) {
                return $this->storeAudio($file, $directory, $recorded ? 'Mensagem de voz' : $name);
            }

            if (! $recorded && in_array('video', $streams, true)) {
                return $this->storeVideo($file, $directory, $name);
            }
        }

        if (! $recorded && isset(self::IMAGES[$mime])) {
            return $this->storeFile($file, $directory, 'image', $mime, $name, self::IMAGES[$mime]);
        }

        if (! $recorded && isset(self::DOCUMENTS[$mime])) {
            return $this->storeFile($file, $directory, 'document', $mime, $name, self::DOCUMENTS[$mime]);
        }

        throw ValidationException::withMessages(['attachment' => 'Formato não compatível. Escolha uma foto, um vídeo, um áudio ou um documento PDF, Office, TXT ou CSV.']);
    }

    /** @return list<string> */
    private function streams(UploadedFile $file): array
    {
        try {
            $result = Process::timeout(10)->run([
                'ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe',
                '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', $file->getPathname(),
            ]);
        } catch (ProcessTimedOutException) {
            throw ValidationException::withMessages(['attachment' => 'Este arquivo demorou demais para ser lido. Tente um arquivo menor.']);
        }

        return $result->successful() ? preg_split('/\s+/', trim($result->output()), -1, PREG_SPLIT_NO_EMPTY) : [];
    }

    /** @return array{path: string, type: string, mime: string, name: string} */
    private function storeAudio(UploadedFile $file, string $directory, string $name): array
    {
        $audio = $this->audio->store($file, 'attachment', $directory, 'private');

        return ['path' => $audio['media_path'], 'type' => 'audio', 'mime' => 'audio/ogg', 'name' => "{$name}.ogg"];
    }

    /** @return array{path: string, type: string, mime: string, name: string} */
    private function storeVideo(UploadedFile $file, string $directory, string $name): array
    {
        $output = tempnam(sys_get_temp_dir(), 'zouth-chat-video-');
        if ($output === false) {
            throw new RuntimeException('Não foi possível preparar o vídeo.');
        }

        try {
            $result = Process::timeout(45)->run([
                'ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-protocol_whitelist', 'file,pipe',
                '-i', $file->getPathname(), '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1',
                '-vf', 'scale=w=min(1280\\,iw):h=min(1280\\,ih):force_original_aspect_ratio=decrease:force_divisible_by=2',
                '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
                '-movflags', '+faststart', '-f', 'mp4', $output,
            ]);
            clearstatcache(true, $output);
            if (! $result->successful() || filesize($output) === 0 || filesize($output) > 20 * 1024 * 1024) {
                throw ValidationException::withMessages(['attachment' => 'Não foi possível preparar esse vídeo. Tente um vídeo menor em MP4.']);
            }

            return $this->storeFile(new File($output), $directory, 'video', 'video/mp4', $name, 'mp4');
        } catch (ProcessTimedOutException) {
            throw ValidationException::withMessages(['attachment' => 'O vídeo demorou demais para processar. Tente um vídeo menor.']);
        } finally {
            unlink($output);
        }
    }

    /** @return array{path: string, type: string, mime: string, name: string} */
    private function storeFile(File|UploadedFile $file, string $directory, string $type, string $mime, string $name, string $extension): array
    {
        $path = Storage::disk('s3')->putFileAs($directory, $file, Str::uuid().".{$extension}", [
            'visibility' => 'private',
            'ContentType' => $mime,
        ]);
        if ($path === false) {
            throw new RuntimeException('Não foi possível guardar o anexo.');
        }

        return ['path' => $path, 'type' => $type, 'mime' => $mime, 'name' => "{$name}.{$extension}"];
    }
}
