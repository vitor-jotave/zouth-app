<?php

namespace App\Services;

use Illuminate\Support\Str;
use InvalidArgumentException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use RuntimeException;
use ZipArchive;

class ProductImportReader
{
    public const MAX_ROWS = 10_000;

    public const MAX_COLUMNS = 80;

    private const MAX_WORKBOOK_ARCHIVE_ENTRIES = 5_000;

    private const MAX_WORKBOOK_UNCOMPRESSED_BYTES = 209_715_200;

    /**
     * @return array{headers: list<string>, rows: list<array{row_number: int, values: array<string, mixed>}>, signature: string}
     */
    public function read(string $path, string $extension): array
    {
        if (! is_file($path)) {
            throw new InvalidArgumentException('A planilha enviada não está mais disponível.');
        }

        if (strtolower($extension) === 'xlsx') {
            $this->assertSafeWorkbookArchive($path);
        }

        $reader = strtolower($extension) === 'csv'
            ? $this->csvReader()
            : IOFactory::createReaderForFile($path);
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($path);
        $sheet = $spreadsheet->getSheetByName('Produtos') ?? $spreadsheet->getActiveSheet();
        $highestRow = min($sheet->getHighestDataRow(), self::MAX_ROWS + 10);
        $highestColumnIndex = min(
            \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($sheet->getHighestDataColumn()),
            self::MAX_COLUMNS,
        );

        if ($sheet->getHighestDataRow() > self::MAX_ROWS + 10) {
            throw new InvalidArgumentException('A planilha pode ter no máximo 10.000 linhas.');
        }

        $headerRow = $this->findHeaderRow($sheet, $highestRow, $highestColumnIndex);
        $headers = [];

        for ($column = 1; $column <= $highestColumnIndex; $column++) {
            $header = trim((string) $sheet->getCell([$column, $headerRow])->getFormattedValue());

            if ($header === '') {
                continue;
            }

            if (in_array($header, $headers, true)) {
                throw new InvalidArgumentException("A coluna \"{$header}\" aparece mais de uma vez.");
            }

            $headers[$column] = $header;
        }

        if (count($headers) < 2) {
            throw new InvalidArgumentException('Não encontramos uma linha de títulos válida na planilha.');
        }

        $rows = [];

        for ($row = $headerRow + 1; $row <= $highestRow; $row++) {
            $values = [];
            $hasValue = false;

            foreach ($headers as $column => $header) {
                $cell = $sheet->getCell([$column, $row]);

                if ($cell->getDataType() === DataType::TYPE_FORMULA) {
                    throw new InvalidArgumentException("A linha {$row} contém fórmula. Substitua fórmulas pelos valores finais.");
                }

                $value = $cell->getValue();
                $value = is_string($value) ? trim($value) : $value;
                $values[$header] = $value;
                $hasValue = $hasValue || ($value !== null && $value !== '');
            }

            if ($hasValue) {
                $rows[] = ['row_number' => $row, 'values' => $values];
            }
        }

        if ($rows === []) {
            throw new InvalidArgumentException('A planilha não contém produtos para importar.');
        }

        $headerList = array_values($headers);

        return [
            'headers' => $headerList,
            'rows' => $rows,
            'signature' => $this->headerSignature($headerList),
        ];
    }

    /**
     * @param  list<string>  $headers
     */
    public function headerSignature(array $headers): string
    {
        $normalized = array_map(
            fn (string $header): string => Str::lower(Str::ascii(trim($header))),
            $headers,
        );

        return hash('sha256', json_encode($normalized, JSON_THROW_ON_ERROR));
    }

    /**
     * @param  list<string>  $headers
     * @return array<string, string>
     */
    public function suggestMapping(array $headers): array
    {
        $aliases = [
            'sku' => ['sku', 'codigo', 'codigo produto', 'referencia', 'ref'],
            'name' => ['nome', 'produto', 'nome produto', 'descricao produto'],
            'description' => ['descricao', 'detalhes', 'descricao completa'],
            'category' => ['categoria', 'grupo', 'departamento'],
            'is_active' => ['ativo', 'status', 'publicado'],
            'price' => ['preco', 'valor', 'preco atacado', 'preco de atacado', 'valor atacado', 'valor de atacado'],
            'stock' => ['estoque', 'saldo', 'quantidade', 'qtd'],
            'variant_sku' => ['sku variacao', 'sku opcao', 'codigo variacao'],
            'variant_price' => ['preco variacao', 'preco opcao'],
            'variant_stock' => ['estoque variacao', 'saldo variacao', 'quantidade variacao'],
            'variation_type_1' => ['variacao 1', 'tipo variacao 1', 'tipo 1'],
            'variation_value_1' => ['valor variacao 1', 'opcao 1', 'valor 1'],
            'variation_type_2' => ['variacao 2', 'tipo variacao 2', 'tipo 2'],
            'variation_value_2' => ['valor variacao 2', 'opcao 2', 'valor 2'],
            'variation_type_3' => ['variacao 3', 'tipo variacao 3', 'tipo 3'],
            'variation_value_3' => ['valor variacao 3', 'opcao 3', 'valor 3'],
            'image_url_1' => ['imagem 1', 'url imagem 1', 'foto 1', 'imagem'],
            'image_url_2' => ['imagem 2', 'url imagem 2', 'foto 2'],
            'image_url_3' => ['imagem 3', 'url imagem 3', 'foto 3'],
            'image_url_4' => ['imagem 4', 'url imagem 4', 'foto 4'],
            'image_url_5' => ['imagem 5', 'url imagem 5', 'foto 5'],
        ];
        $normalizedHeaders = collect($headers)->mapWithKeys(
            fn (string $header): array => [Str::lower(Str::ascii(trim($header))) => $header],
        );
        $mapping = [];

        foreach ($aliases as $field => $candidates) {
            foreach ($candidates as $candidate) {
                if ($normalizedHeaders->has($candidate)) {
                    $mapping[$field] = $normalizedHeaders->get($candidate);
                    break;
                }
            }
        }

        return $mapping;
    }

    private function assertSafeWorkbookArchive(string $path): void
    {
        $archive = new ZipArchive;

        if ($archive->open($path) !== true) {
            throw new InvalidArgumentException('O arquivo XLSX não é válido.');
        }

        try {
            if ($archive->numFiles > self::MAX_WORKBOOK_ARCHIVE_ENTRIES) {
                throw new RuntimeException('A planilha compactada contém arquivos demais.');
            }

            $uncompressedBytes = 0;

            for ($index = 0; $index < $archive->numFiles; $index++) {
                $stat = $archive->statIndex($index);
                $name = (string) ($stat['name'] ?? '');
                $uncompressedBytes += (int) ($stat['size'] ?? 0);

                if ($name === ''
                    || str_starts_with($name, '/')
                    || str_starts_with($name, '\\')
                    || preg_match('/(^|[\\\\\/])\.\.([\\\\\/]|$)/', $name) === 1) {
                    throw new RuntimeException('A planilha compactada contém um caminho inseguro.');
                }

                if ($uncompressedBytes > self::MAX_WORKBOOK_UNCOMPRESSED_BYTES) {
                    throw new RuntimeException('O conteúdo descompactado da planilha ultrapassa 200 MB.');
                }
            }
        } catch (RuntimeException $exception) {
            throw new InvalidArgumentException($exception->getMessage(), previous: $exception);
        } finally {
            $archive->close();
        }
    }

    private function csvReader(): Csv
    {
        $reader = new Csv;
        $reader->setInputEncoding('UTF-8');
        $reader->setFallbackEncoding('Windows-1252');
        $reader->setDelimiter(null);

        return $reader;
    }

    private function findHeaderRow(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet,
        int $highestRow,
        int $highestColumnIndex,
    ): int {
        for ($row = 1; $row <= min($highestRow, 10); $row++) {
            $filled = 0;

            for ($column = 1; $column <= $highestColumnIndex; $column++) {
                if (trim((string) $sheet->getCell([$column, $row])->getFormattedValue()) !== '') {
                    $filled++;
                }
            }

            if ($filled >= 2) {
                return $row;
            }
        }

        throw new InvalidArgumentException('Não encontramos os títulos das colunas nas primeiras linhas.');
    }
}
