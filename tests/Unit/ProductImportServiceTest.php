<?php

use App\Services\ProductImportReader;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

it('reads semicolon separated ERP exports and suggests common mappings', function () {
    $path = tempnam(sys_get_temp_dir(), 'zouth-import-').'.csv';
    file_put_contents($path, "Código;Produto;Preço de atacado;Saldo\nA-01;Body Nuvem;79,90;8");
    $reader = new ProductImportReader;
    $result = $reader->read($path, 'csv');
    $mapping = $reader->suggestMapping($result['headers']);

    expect($result['headers'])->toBe(['Código', 'Produto', 'Preço de atacado', 'Saldo'])
        ->and($result['rows'][0]['values']['Produto'])->toBe('Body Nuvem')
        ->and($mapping)->toMatchArray([
            'sku' => 'Código',
            'name' => 'Produto',
            'price' => 'Preço de atacado',
            'stock' => 'Saldo',
        ]);

    unlink($path);
});

it('rejects formulas instead of executing spreadsheet content', function () {
    $spreadsheet = new Spreadsheet;
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->fromArray(['SKU', 'Nome'], null, 'A1');
    $sheet->setCellValue('A2', 'A-01');
    $sheet->setCellValue('B2', '=CONCAT("Body", " Nuvem")');
    $path = tempnam(sys_get_temp_dir(), 'zouth-import-').'.xlsx';
    (new Xlsx($spreadsheet))->save($path);

    expect(fn () => (new ProductImportReader)->read($path, 'xlsx'))
        ->toThrow(InvalidArgumentException::class, 'contém fórmula');

    unlink($path);
});

it('rejects a malformed XLSX archive before loading workbook content', function () {
    $path = tempnam(sys_get_temp_dir(), 'zouth-import-').'.xlsx';
    file_put_contents($path, 'not-a-workbook');

    expect(fn () => (new ProductImportReader)->read($path, 'xlsx'))
        ->toThrow(InvalidArgumentException::class, 'XLSX não é válido');

    unlink($path);
});
