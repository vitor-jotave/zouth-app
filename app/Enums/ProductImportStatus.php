<?php

namespace App\Enums;

enum ProductImportStatus: string
{
    case Uploaded = 'uploaded';
    case Mapping = 'mapping';
    case Validating = 'validating';
    case Ready = 'ready';
    case Processing = 'processing';
    case Completed = 'completed';
    case CompletedWithErrors = 'completed_with_errors';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Uploaded => 'Arquivo recebido',
            self::Mapping => 'Relacionando colunas',
            self::Validating => 'Conferindo coleção',
            self::Ready => 'Pronta para entrar no catálogo',
            self::Processing => 'Levando peças para o catálogo',
            self::Completed => 'Coleção importada',
            self::CompletedWithErrors => 'Importada com pendências',
            self::Failed => 'Importação interrompida',
            self::Cancelled => 'Importação cancelada',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [
            self::Completed,
            self::CompletedWithErrors,
            self::Failed,
            self::Cancelled,
        ], true);
    }
}
