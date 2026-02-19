import type { FormDataConvertible } from '@inertiajs/core';
import { Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type PlanFormData = {
    name: string;
    description: string;
    is_active: boolean;
    sort_order: number;
    monthly_price: string;
    trial_days: number;
    max_reps: string;
    max_products: string;
    max_orders_per_month: string;
    max_users: string;
    max_data_mb: string;
    max_files_gb: string;
    allow_csv_import: boolean;
    [key: string]: FormDataConvertible;
};

type PlanFormProps = {
    data: PlanFormData;
    setData: <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => void;
    errors: Partial<Record<keyof PlanFormData, string>>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
};

export default function PlanForm({ data, setData, errors, processing, onSubmit, submitLabel }: PlanFormProps) {
    return (
        <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações Básicas</h3>

                <div>
                    <Label htmlFor="name">Nome do Plano</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="mt-1"
                        autoFocus
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div>
                    <Label htmlFor="description">Descrição</Label>
                    <textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        rows={3}
                    />
                    <InputError message={errors.description} className="mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="monthly_price">Preço Mensal (R$)</Label>
                        <Input
                            id="monthly_price"
                            type="text"
                            inputMode="decimal"
                            value={data.monthly_price}
                            onChange={(e) => setData('monthly_price', e.target.value)}
                            className="mt-1"
                            placeholder="49,90"
                        />
                        <InputError message={errors.monthly_price} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="sort_order">Ordem de Exibição</Label>
                        <Input
                            id="sort_order"
                            type="number"
                            min={0}
                            value={data.sort_order}
                            onChange={(e) => setData('sort_order', parseInt(e.target.value) || 0)}
                            className="mt-1"
                        />
                        <InputError message={errors.sort_order} className="mt-2" />
                    </div>
                </div>

                <div>
                    <Label htmlFor="trial_days">Dias de Trial</Label>
                    <Input
                        id="trial_days"
                        type="number"
                        min={0}
                        value={data.trial_days}
                        onChange={(e) => setData('trial_days', parseInt(e.target.value) || 0)}
                        className="mt-1"
                    />
                    <InputError message={errors.trial_days} className="mt-2" />
                </div>
            </div>

            {/* Limits */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Limites</h3>
                <p className="text-muted-foreground text-sm">
                    Deixe vazio para ilimitado.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="max_reps">Máx. Representantes</Label>
                        <Input
                            id="max_reps"
                            type="number"
                            min={1}
                            value={data.max_reps}
                            onChange={(e) => setData('max_reps', e.target.value)}
                            className="mt-1"
                            placeholder="Ilimitado"
                        />
                        <InputError message={errors.max_reps} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="max_products">Máx. Produtos</Label>
                        <Input
                            id="max_products"
                            type="number"
                            min={1}
                            value={data.max_products}
                            onChange={(e) => setData('max_products', e.target.value)}
                            className="mt-1"
                            placeholder="Ilimitado"
                        />
                        <InputError message={errors.max_products} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="max_orders_per_month">Máx. Pedidos/mês</Label>
                        <Input
                            id="max_orders_per_month"
                            type="number"
                            min={1}
                            value={data.max_orders_per_month}
                            onChange={(e) => setData('max_orders_per_month', e.target.value)}
                            className="mt-1"
                            placeholder="Ilimitado"
                        />
                        <InputError message={errors.max_orders_per_month} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="max_users">Máx. Usuários</Label>
                        <Input
                            id="max_users"
                            type="number"
                            min={1}
                            value={data.max_users}
                            onChange={(e) => setData('max_users', e.target.value)}
                            className="mt-1"
                            placeholder="Ilimitado"
                        />
                        <InputError message={errors.max_users} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="max_data_mb">Máx. Dados (MB)</Label>
                        <Input
                            id="max_data_mb"
                            type="number"
                            min={1}
                            value={data.max_data_mb}
                            onChange={(e) => setData('max_data_mb', e.target.value)}
                            className="mt-1"
                            placeholder="Ilimitado"
                        />
                        <InputError message={errors.max_data_mb} className="mt-2" />
                    </div>

                    <div>
                        <Label htmlFor="max_files_gb">Máx. Arquivos (GB)</Label>
                        <Input
                            id="max_files_gb"
                            type="number"
                            min={1}
                            value={data.max_files_gb}
                            onChange={(e) => setData('max_files_gb', e.target.value)}
                            className="mt-1"
                            placeholder="Ilimitado"
                        />
                        <InputError message={errors.max_files_gb} className="mt-2" />
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Recursos</h3>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="allow_csv_import"
                        checked={data.allow_csv_import}
                        onCheckedChange={(checked) => setData('allow_csv_import', checked === true)}
                    />
                    <Label htmlFor="allow_csv_import">Permitir Importação CSV</Label>
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="is_active"
                        checked={data.is_active}
                        onCheckedChange={(checked) => setData('is_active', checked === true)}
                    />
                    <Label htmlFor="is_active">Plano Ativo</Label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/admin/plans">Cancelar</Link>
                </Button>
            </div>
        </form>
    );
}
