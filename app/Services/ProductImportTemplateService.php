<?php

namespace App\Services;

use App\Models\Manufacturer;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductImportTemplateService
{
    /** @var list<string> */
    public const HEADERS = [
        'SKU principal',
        'Nome',
        'Descrição',
        'Categoria',
        'Ativo',
        'Preço geral',
        'Estoque',
        'SKU da opção',
        'Preço da opção',
        'Estoque da opção',
        'Tipo de variação 1',
        'Valor de variação 1',
        'Tipo de variação 2',
        'Valor de variação 2',
        'Tipo de variação 3',
        'Valor de variação 3',
        'Imagem 1',
        'Imagem 2',
        'Imagem 3',
        'Imagem 4',
        'Imagem 5',
    ];

    public function make(Manufacturer $manufacturer): Spreadsheet
    {
        $manufacturer->loadMissing(['productCategories', 'variationTypes.values']);
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Zouth')
            ->setTitle("Modelo de coleção — {$manufacturer->name}")
            ->setDescription('Modelo assistido para trazer produtos ao catálogo Zouth.');
        $instructions = $spreadsheet->getActiveSheet();
        $instructions->setTitle('Como preencher');
        $this->instructions($instructions, $manufacturer);
        $products = $spreadsheet->createSheet();
        $products->setTitle('Produtos');
        $this->products($products);
        $example = $spreadsheet->createSheet();
        $example->setTitle('Exemplo');
        $this->example($example);
        $references = $spreadsheet->createSheet();
        $references->setTitle('Referências da marca');
        $this->references($references, $manufacturer);
        $spreadsheet->setActiveSheetIndex(1);

        return $spreadsheet;
    }

    private function instructions(Worksheet $sheet, Manufacturer $manufacturer): void
    {
        $sheet->mergeCells('A1:H2');
        $sheet->setCellValue('A1', 'Sua coleção, pronta para entrar em movimento.');
        $sheet->mergeCells('A4:H4');
        $sheet->setCellValue('A4', "Modelo preparado para {$manufacturer->name}");
        $sheet->fromArray([
            ['01', 'Uma linha por peça vendável', 'Produtos sem variação usam uma linha. Cor e tamanho usam uma linha por combinação.'],
            ['02', 'SKU é a referência', 'A Zouth usa o SKU principal para criar ou reencontrar o produto sem duplicá-lo.'],
            ['03', 'Vazio preserva', 'Em uma nova importação, células vazias não apagam informações que já estão no catálogo.'],
            ['04', 'Imagens podem vir depois', 'Cole URLs nas colunas Imagem ou envie um ZIP com arquivos SKU.jpg, SKU_02.jpg e assim por diante.'],
        ], null, 'A7');
        $sheet->mergeCells('A13:H13');
        $sheet->setCellValue('A13', 'Não use fórmulas. Cole os valores finais exportados pelo seu ERP.');
        $sheet->getStyle('A1:H2')->applyFromArray([
            'font' => ['name' => 'Arial', 'size' => 24, 'bold' => true, 'color' => ['rgb' => '18181F']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F6F4F0']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getStyle('A4:H4')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF4D3D'));
        $sheet->getStyle('A7:C10')->applyFromArray([
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D8D4CC']]],
            'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
        ]);
        $sheet->getStyle('A7:A10')->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF4D3D'));
        $sheet->getStyle('B7:B10')->getFont()->setBold(true);
        $sheet->getColumnDimension('A')->setWidth(8);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(72);
        $sheet->getRowDimension(1)->setRowHeight(36);
        $sheet->setShowGridlines(false);
    }

    private function products(Worksheet $sheet): void
    {
        $sheet->fromArray(self::HEADERS, null, 'A1');
        $this->styleDataSheet($sheet);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:U1');
    }

    private function example(Worksheet $sheet): void
    {
        $sheet->fromArray(self::HEADERS, null, 'A1');
        $rows = [
            ['ACON-001', 'Macacão Aconchego', 'Toque macio para os primeiros dias.', 'Macacões', 'Sim', '129,90', '', 'ACON-001-VD-P', '', 7, 'Cor', 'Verde', 'Tamanho', 'P', '', '', 'https://exemplo.com/aconchego-1.jpg'],
            ['ACON-001', 'Macacão Aconchego', 'Toque macio para os primeiros dias.', 'Macacões', 'Sim', '129,90', '', 'ACON-001-VD-M', '', 8, 'Cor', 'Verde', 'Tamanho', 'M'],
            ['BODY-014', 'Body Nuvem', 'Algodão leve e acabamento delicado.', 'Bodies', 'Sim', '79,90', 20],
        ];
        $sheet->fromArray($rows, null, 'A2');
        $this->styleDataSheet($sheet);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:U4');
    }

    private function references(Worksheet $sheet, Manufacturer $manufacturer): void
    {
        $sheet->setCellValue('A1', 'Categorias já usadas');
        $sheet->setCellValue('C1', 'Tipos e valores de variação');
        $row = 2;

        foreach ($manufacturer->productCategories->sortBy('name') as $category) {
            $sheet->setCellValue("A{$row}", $category->name);
            $row++;
        }

        $row = 2;

        foreach ($manufacturer->variationTypes->sortBy('display_order') as $type) {
            foreach ($type->values as $value) {
                $sheet->setCellValue("C{$row}", $type->name);
                $sheet->setCellValue("D{$row}", $value->value);
                $row++;
            }
        }

        $sheet->getStyle('A1:D1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'F6F4F0']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '18181F']],
        ]);
        $sheet->getColumnDimension('A')->setWidth(34);
        $sheet->getColumnDimension('C')->setWidth(28);
        $sheet->getColumnDimension('D')->setWidth(34);
        $sheet->setShowGridlines(false);
    }

    private function styleDataSheet(Worksheet $sheet): void
    {
        $sheet->getStyle('A1:U1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'F6F4F0']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '18181F']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
        ]);
        $sheet->getStyle('A1')->getFill()->getStartColor()->setRGB('FF4D3D');
        $sheet->getRowDimension(1)->setRowHeight(34);

        foreach (range('A', 'U') as $column) {
            $sheet->getColumnDimension($column)->setWidth(in_array($column, ['C', 'Q', 'R', 'S', 'T', 'U'], true) ? 34 : 22);
        }

        $sheet->setShowGridlines(false);
    }
}
