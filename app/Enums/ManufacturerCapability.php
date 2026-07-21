<?php

namespace App\Enums;

enum ManufacturerCapability: string
{
    case Collection = 'collection.manage';
    case Catalog = 'catalog.manage';
    case Orders = 'orders.manage';
    case Customers = 'customers.manage';
    case Affiliations = 'affiliations.manage';
    case Whatsapp = 'whatsapp.manage';

    public function label(): string
    {
        return match ($this) {
            self::Collection => 'Coleção e produtos',
            self::Catalog => 'Catálogo',
            self::Orders => 'Pedidos',
            self::Customers => 'Clientes',
            self::Affiliations => 'Representantes',
            self::Whatsapp => 'Atendimento',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Collection => 'Produtos, combos, categorias e variações.',
            self::Catalog => 'Personalização, publicação e link comercial.',
            self::Orders => 'Consulta e andamento dos pedidos.',
            self::Customers => 'Cadastro e histórico dos lojistas.',
            self::Affiliations => 'Aprovar e acompanhar afiliações.',
            self::Whatsapp => 'Conversas e funis do WhatsApp.',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            fn (self $capability): string => $capability->value,
            self::cases(),
        );
    }

    /**
     * @return list<string>
     */
    public static function suggestedForStaff(): array
    {
        return [
            self::Collection->value,
            self::Catalog->value,
            self::Orders->value,
            self::Customers->value,
        ];
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $capability): array => [
                'value' => $capability->value,
                'label' => $capability->label(),
                'description' => $capability->description(),
            ],
            self::cases(),
        );
    }
}
