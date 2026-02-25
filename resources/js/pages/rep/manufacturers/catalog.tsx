import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Box, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
}

interface Props {
    manufacturer: Manufacturer;
    products: {
        data: Array<{
            id: number;
            name: string;
            sku: string;
            category?: string | null;
            primary_image?: string | null;
            images: string[];
            variations: Array<{
                type_name: string;
                is_color_type: boolean;
                values: Array<{ value: string; hex?: string | null }>;
            }>;
            variant_stocks: Array<{
                variation_key: Record<string, string>;
                quantity: number;
                price_cents?: number | null;
            }>;
            total_stock: number;
            price_cents?: number | null;
        }>;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

function formatPrice(priceCents?: number | null): string {
    if (priceCents == null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

export default function Catalog({ manufacturer, products }: Props) {
    return (
        <AppLayout>
            <Head title={`Catálogo - ${manufacturer.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center gap-4">
                        <Link href="/rep/manufacturers">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h2 className="text-2xl font-semibold">
                            Catálogo - {manufacturer.name}
                        </h2>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Catalogo de Produtos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {products.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Package className="mb-4 h-16 w-16 text-muted-foreground" />
                                    <h3 className="mb-2 text-lg font-medium">
                                        Nenhum produto disponivel
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Este fabricante ainda nao possui produtos ativos.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {products.data.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex h-full flex-col overflow-hidden rounded-xl border bg-background"
                                        >
                                            {product.primary_image ? (
                                                <img
                                                    src={product.primary_image}
                                                    alt={product.name}
                                                    className="h-40 w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-40 items-center justify-center bg-muted">
                                                    <Box className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="flex flex-1 flex-col gap-3 p-4">
                                                <div>
                                                    <div className="text-lg font-semibold">
                                                        {product.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        SKU {product.sku}
                                                    </div>
                                                    <div className={`text-sm font-semibold ${product.price_cents == null ? 'italic text-muted-foreground' : ''}`}>
                                                        {formatPrice(product.price_cents)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {product.category && (
                                                        <Badge variant="outline">
                                                            {product.category}
                                                        </Badge>
                                                    )}
                                                    <Badge variant={product.total_stock > 0 ? 'default' : 'secondary'}>
                                                        {product.total_stock > 0
                                                            ? 'Disponivel'
                                                            : 'Sem estoque'}
                                                    </Badge>
                                                </div>
                                                {product.variations.length > 0 && (
                                                    <div className="space-y-2 text-xs text-muted-foreground">
                                                        {product.variations.map((variation) => (
                                                            <div key={variation.type_name}>
                                                                {variation.type_name}:{' '}
                                                                {variation.values.map((v) => v.value).join(', ') || '---'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
