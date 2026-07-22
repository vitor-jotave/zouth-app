import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BadgePercent,
    Boxes,
    Check,
    Copy,
    Layers3,
    MoreHorizontal,
    Pencil,
    Plus,
    ShoppingBag,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import {
    evaluateOrderRules,
    pendingRuleProgress,
    type OrderRuleAction,
    type OrderRuleActionType,
    type OrderRuleCondition,
    type OrderRuleContract,
    type OrderRuleMatchMode,
    type OrderRuleMetric,
    type OrderRuleOperator,
    type OrderRuleScopeType,
} from '@/lib/order-rules';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type ProductOption = {
    id: number;
    name: string;
    sku: string | null;
    product_category_id: number | null;
};

type CategoryOption = {
    id: number;
    name: string;
};

type RuleSummary = {
    total: number;
    active: number;
    limits: number;
    benefits: number;
};

type Props = {
    order_rules: OrderRuleContract[];
    rule_summary: RuleSummary;
    products: ProductOption[];
    categories: CategoryOption[];
};

type RuleFormData = {
    name: string;
    description: string;
    is_active: boolean;
    match_mode: OrderRuleMatchMode;
    conditions: OrderRuleCondition[];
    action: OrderRuleAction;
    public_message: string;
    sort_order?: number;
};

type EditorState =
    | { mode: 'create'; shortcut?: ShortcutKey }
    | { mode: 'edit'; rule: OrderRuleContract };

type ShortcutKey =
    | 'minimum_order'
    | 'discount_value'
    | 'discount_volume'
    | 'minimum_variety'
    | 'scoped_condition';

type SimulationState = {
    subtotal_cents: number;
    total_quantity: number;
    distinct_products: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Pedidos', href: manufacturer.orders.index().url },
    { title: 'Regras de pedido', href: manufacturer.orderRules.index().url },
];

const metricLabels: Record<OrderRuleMetric, string> = {
    subtotal_cents: 'Valor do pedido',
    total_quantity: 'Quantidade de peças',
    distinct_products: 'Modelos diferentes',
};

const sentenceMetricLabels: Record<OrderRuleMetric, string> = {
    subtotal_cents: 'o valor do pedido',
    total_quantity: 'a quantidade de peças',
    distinct_products: 'a quantidade de modelos diferentes',
};

const operatorLabels: Record<OrderRuleOperator, string> = {
    gte: 'for maior ou igual a',
    lte: 'for menor ou igual a',
    eq: 'for igual a',
    between: 'estiver entre',
};

const shortcutMeta: Array<{
    key: ShortcutKey;
    title: string;
    description: string;
    icon: typeof ShoppingBag;
}> = [
    {
        key: 'minimum_order',
        title: 'Pedido mínimo',
        description: 'Bloqueie pedidos abaixo do valor de entrada.',
        icon: ShoppingBag,
    },
    {
        key: 'discount_value',
        title: 'Desconto por valor',
        description: 'Recompense quem avança no valor do pedido.',
        icon: BadgePercent,
    },
    {
        key: 'discount_volume',
        title: 'Desconto por volume',
        description: 'Crie um incentivo por quantidade de peças.',
        icon: Boxes,
    },
    {
        key: 'minimum_variety',
        title: 'Variedade mínima',
        description: 'Peça uma seleção mais ampla de modelos.',
        icon: Layers3,
    },
    {
        key: 'scoped_condition',
        title: 'Produto ou categoria',
        description: 'Faça a regra valer apenas para parte da coleção.',
        icon: ArrowRight,
    },
];

function emptyCondition(): OrderRuleCondition {
    return {
        metric: 'subtotal_cents',
        operator: 'gte',
        value: 200000,
        max_value: null,
        scope_type: null,
        scope_ids: [],
    };
}

function shortcutForm(
    shortcut: ShortcutKey,
    categories: CategoryOption[],
    products: ProductOption[],
): RuleFormData {
    const defaults: Record<ShortcutKey, RuleFormData> = {
        minimum_order: {
            name: 'Pedido mínimo',
            description: 'O ponto de entrada comercial deste catálogo.',
            is_active: true,
            match_mode: 'all',
            conditions: [
                {
                    ...emptyCondition(),
                    operator: 'lte',
                    value: 149999,
                },
            ],
            action: { type: 'block_checkout', value: null },
            public_message:
                'O pedido mínimo é de R$ 1.500. Adicione mais peças para continuar.',
        },
        discount_value: {
            name: 'Desconto por valor',
            description: 'Um incentivo para o lojista ampliar a seleção.',
            is_active: true,
            match_mode: 'all',
            conditions: [{ ...emptyCondition(), value: 200000 }],
            action: { type: 'percentage_discount', value: 500 },
            public_message: 'Você liberou 5% de desconto neste pedido.',
        },
        discount_volume: {
            name: 'Desconto por volume',
            description: 'Mais peças, mais vantagem para o lojista.',
            is_active: true,
            match_mode: 'all',
            conditions: [
                {
                    ...emptyCondition(),
                    metric: 'total_quantity',
                    value: 30,
                },
            ],
            action: { type: 'fixed_discount', value: 15000 },
            public_message: 'Você liberou R$ 150 de desconto neste pedido.',
        },
        minimum_variety: {
            name: 'Variedade mínima',
            description: 'Uma seleção equilibrada para a vitrine do lojista.',
            is_active: true,
            match_mode: 'all',
            conditions: [
                {
                    ...emptyCondition(),
                    metric: 'distinct_products',
                    operator: 'lte',
                    value: 7,
                },
            ],
            action: { type: 'block_checkout', value: null },
            public_message:
                'Escolha ao menos 8 modelos diferentes para finalizar.',
        },
        scoped_condition: {
            name: 'Incentivo de coleção',
            description: 'Uma condição dedicada a uma linha da coleção.',
            is_active: true,
            match_mode: 'all',
            conditions: [
                {
                    ...emptyCondition(),
                    metric: 'total_quantity',
                    value: 12,
                    scope_type:
                        categories.length > 0 ? 'categories' : 'products',
                    scope_ids:
                        categories.length > 0
                            ? [categories[0].id]
                            : products[0]
                              ? [products[0].id]
                              : [],
                },
            ],
            action: { type: 'percentage_discount', value: 500 },
            public_message: 'A seleção desta coleção liberou 5% de desconto.',
        },
    };

    return defaults[shortcut];
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 2,
    }).format(cents / 100);
}

function formatPercent(basisPoints: number): string {
    return `${new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 2,
    }).format(basisPoints / 100)}%`;
}

function conditionValueLabel(condition: OrderRuleCondition): string {
    const value =
        condition.metric === 'subtotal_cents'
            ? formatCurrency(condition.value)
            : new Intl.NumberFormat('pt-BR').format(condition.value);

    if (condition.operator !== 'between' || condition.max_value === null) {
        return value;
    }

    const maximum =
        condition.metric === 'subtotal_cents'
            ? formatCurrency(condition.max_value)
            : new Intl.NumberFormat('pt-BR').format(condition.max_value);

    return `${value} e ${maximum}`;
}

function actionLabel(action: OrderRuleAction): string {
    if (action.type === 'block_checkout') return 'impedir finalização';
    if (action.type === 'percentage_discount') {
        return `liberar ${formatPercent(action.value ?? 0)} de desconto`;
    }

    return `liberar ${formatCurrency(action.value ?? 0)} de desconto`;
}

function scopeLabel(
    condition: OrderRuleCondition,
    categories: CategoryOption[],
    products: ProductOption[],
): string {
    if (!condition.scope_type || condition.scope_ids.length === 0) return '';

    const options =
        condition.scope_type === 'categories' ? categories : products;
    const names = options
        .filter((option) => condition.scope_ids.includes(option.id))
        .map((option) => option.name);

    if (names.length === 0) return '';
    if (names.length === 1) return ` em ${names[0]}`;

    return ` em ${names.length} seleções`;
}

function ruleSentence(
    rule: Pick<OrderRuleContract, 'conditions' | 'action' | 'match_mode'>,
    categories: CategoryOption[],
    products: ProductOption[],
): string {
    const phrases = rule.conditions.map((condition) => {
        const scope = scopeLabel(condition, categories, products);

        if (
            rule.action.type === 'block_checkout' &&
            condition.operator === 'lte'
        ) {
            if (condition.metric === 'subtotal_cents') {
                return `o valor do pedido não atingir ${formatCurrency(condition.value + 1)}${scope}`;
            }

            if (condition.metric === 'distinct_products') {
                return `a seleção não reunir ${condition.value + 1} modelos diferentes${scope}`;
            }

            return `a quantidade de peças não alcançar ${condition.value + 1}${scope}`;
        }

        return `${sentenceMetricLabels[condition.metric]} ${operatorLabels[condition.operator]} ${conditionValueLabel(condition)}${scope}`;
    });

    return `Se ${phrases.join(rule.match_mode === 'all' ? ' e ' : ' ou ')}, então ${actionLabel(rule.action)}.`;
}

function simulationCart(simulation: SimulationState) {
    const modelCount = Math.max(
        1,
        Math.min(simulation.distinct_products, simulation.total_quantity),
    );
    const items = Array.from({ length: modelCount }, (_, index) => ({
        product_id: index + 1,
        product_category_id: index === 0 ? 1 : null,
        quantity: 1,
        unit_price_cents: index === 0 ? simulation.subtotal_cents : null,
    }));
    const remainingQuantity = Math.max(
        0,
        simulation.total_quantity - modelCount,
    );

    if (remainingQuantity > 0) {
        items.push({
            product_id: 1,
            product_category_id: 1,
            quantity: remainingQuantity,
            unit_price_cents: null,
        });
    }

    return items;
}

function evaluationStatus(
    rule: Pick<OrderRuleContract, 'action'>,
    matched: boolean,
): { label: string; isPositive: boolean } {
    if (rule.action.type === 'block_checkout') {
        return matched
            ? { label: 'Limite violado', isPositive: false }
            : { label: 'Limite atendido', isPositive: true };
    }

    return matched
        ? { label: 'Vantagem liberada', isPositive: true }
        : { label: 'Condição pendente', isPositive: false };
}

function evaluationMessage(
    rule: Pick<OrderRuleContract, 'action' | 'public_message'>,
    matched: boolean,
    fallback: string,
): string {
    if (rule.action.type === 'block_checkout' && !matched) {
        return 'O lojista já pode avançar: este limite foi atendido.';
    }

    if (rule.action.type !== 'block_checkout' && !matched) {
        return 'A vantagem ainda não aparece no carrinho; a régua mostra quanto falta para liberar.';
    }

    return rule.public_message || fallback;
}

function numberInputValue(
    condition: OrderRuleCondition,
    value: number,
): number {
    return condition.metric === 'subtotal_cents' ? value / 100 : value;
}

function numberInputToStored(
    condition: OrderRuleCondition,
    value: string,
): number {
    const parsed = Number(value.replace(',', '.'));

    if (!Number.isFinite(parsed)) return 0;

    return condition.metric === 'subtotal_cents'
        ? Math.round(parsed * 100)
        : Math.round(parsed);
}

export default function OrderRulesIndex({
    order_rules,
    rule_summary,
    products,
    categories,
}: Props) {
    const [selectedRuleId, setSelectedRuleId] = useState<number | null>(
        order_rules[0]?.id ?? null,
    );
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [deleteRule, setDeleteRule] = useState<OrderRuleContract | null>(
        null,
    );
    const [simulation, setSimulation] = useState<SimulationState>({
        subtotal_cents: 168000,
        total_quantity: 18,
        distinct_products: 7,
    });
    const form = useForm<RuleFormData>(
        shortcutForm('minimum_order', categories, products),
    );

    const limits = order_rules.filter(
        (rule) => rule.action.type === 'block_checkout',
    );
    const benefits = order_rules.filter(
        (rule) => rule.action.type !== 'block_checkout',
    );
    const selectedRule =
        order_rules.find((rule) => rule.id === selectedRuleId) ??
        order_rules[0] ??
        null;
    const liveRule: OrderRuleContract | null = selectedRule
        ? { ...selectedRule, is_active: true }
        : null;
    const simulationItems = useMemo(
        () => simulationCart(simulation),
        [simulation],
    );
    const selectedEvaluation = liveRule
        ? evaluateOrderRules([liveRule], simulationItems)
        : null;
    const selectedRuleEvaluation = selectedEvaluation?.evaluations[0] ?? null;
    const selectedStatus =
        selectedRule && selectedRuleEvaluation
            ? evaluationStatus(selectedRule, selectedRuleEvaluation.matched)
            : null;
    const progress = selectedRuleEvaluation
        ? pendingRuleProgress(selectedRuleEvaluation)
        : null;

    useEffect(() => {
        if (selectedRuleId === null && order_rules[0]) {
            setSelectedRuleId(order_rules[0].id);
        }

        if (
            selectedRuleId !== null &&
            !order_rules.some((rule) => rule.id === selectedRuleId)
        ) {
            setSelectedRuleId(order_rules[0]?.id ?? null);
        }
    }, [order_rules, selectedRuleId]);

    const openCreateEditor = (shortcut: ShortcutKey = 'minimum_order') => {
        form.setData(shortcutForm(shortcut, categories, products));
        form.clearErrors();
        setEditor({ mode: 'create', shortcut });
    };

    const openEditEditor = (rule: OrderRuleContract) => {
        form.setData({
            name: rule.name,
            description: rule.description ?? '',
            is_active: rule.is_active !== false,
            match_mode: rule.match_mode,
            conditions: rule.conditions,
            action: rule.action,
            public_message: rule.public_message ?? '',
            sort_order: rule.sort_order,
        });
        form.clearErrors();
        setSelectedRuleId(rule.id);
        setEditor({ mode: 'edit', rule });
    };

    const closeEditor = () => {
        setEditor(null);
        form.clearErrors();
    };

    const submitRule = (event: React.FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: closeEditor,
        };

        if (editor?.mode === 'edit') {
            form.put(
                manufacturer.orderRules.update(editor.rule.id).url,
                options,
            );
            return;
        }

        form.post(manufacturer.orderRules.store().url, options);
    };

    const toggleRule = (rule: OrderRuleContract) => {
        router.post(
            manufacturer.orderRules.toggle(rule.id).url,
            { is_active: !rule.is_active },
            { preserveScroll: true },
        );
    };

    const duplicateRule = (rule: OrderRuleContract) => {
        router.post(
            manufacturer.orderRules.duplicate(rule.id).url,
            {},
            { preserveScroll: true },
        );
    };

    const confirmDelete = () => {
        if (!deleteRule) return;

        router.delete(manufacturer.orderRules.destroy(deleteRule.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleteRule(null),
        });
    };

    const updateCondition = (
        index: number,
        patch: Partial<OrderRuleCondition>,
    ) => {
        form.setData(
            'conditions',
            form.data.conditions.map((condition, conditionIndex) =>
                conditionIndex === index
                    ? { ...condition, ...patch }
                    : condition,
            ),
        );
    };

    const addCondition = () => {
        form.setData('conditions', [...form.data.conditions, emptyCondition()]);
    };

    const removeCondition = (index: number) => {
        if (form.data.conditions.length === 1) return;

        form.setData(
            'conditions',
            form.data.conditions.filter(
                (_, conditionIndex) => conditionIndex !== index,
            ),
        );
    };

    const toggleScopeId = (index: number, id: number) => {
        const condition = form.data.conditions[index];
        const scopeIds = condition.scope_ids.includes(id)
            ? condition.scope_ids.filter((scopeId) => scopeId !== id)
            : [...condition.scope_ids, id];

        updateCondition(index, { scope_ids: scopeIds });
    };

    const editorSentence = ruleSentence(form.data, categories, products);
    const editorSimulationRule: OrderRuleContract = {
        id: 0,
        name: form.data.name || 'Nova regra',
        is_active: true,
        match_mode: form.data.match_mode,
        conditions: form.data.conditions,
        action: form.data.action,
        public_message: form.data.public_message,
    };
    const editorEvaluation = evaluateOrderRules(
        [editorSimulationRule],
        simulationItems,
    );
    const editorMatched = editorEvaluation.evaluations[0]?.matched ?? false;
    const editorStatus = evaluationStatus(editorSimulationRule, editorMatched);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Regras de pedido" />

            <div className="mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Comercial"
                    title={
                        <>
                            Regras de pedido
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <p>
                            Defina os limites da venda e os incentivos que fazem
                            o lojista avançar.
                        </p>
                    }
                    aside={
                        <div className="grid w-full gap-4 sm:w-64 sm:justify-self-end">
                            <Button
                                type="button"
                                onClick={() => openCreateEditor()}
                                className="min-h-12 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Nova regra
                            </Button>
                            <p className="text-center font-zouth-display text-sm font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                                {rule_summary.active} ativas
                                <span className="px-2 text-[#98968d]">·</span>
                                {rule_summary.total} no total
                            </p>
                        </div>
                    }
                />

                {order_rules.length === 0 ? (
                    <section className="mt-10 grid min-h-[520px] place-items-center border-y border-border py-16 text-center">
                        <div className="max-w-xl">
                            <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                Seu atacado, do seu jeito
                            </p>
                            <h2 className="mt-5 font-zouth-display text-[clamp(2rem,4vw,3.5rem)] leading-[0.96] font-semibold tracking-[-0.05em] text-foreground">
                                Comece pelo acordo comercial mais importante.
                            </h2>
                            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                                Um pedido mínimo ou uma vantagem por volume já
                                muda a conversa no carrinho.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-3">
                                {shortcutMeta.slice(0, 4).map((shortcut) => (
                                    <Button
                                        key={shortcut.key}
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            openCreateEditor(shortcut.key)
                                        }
                                        className="min-h-11 rounded-[2px] bg-transparent shadow-none"
                                    >
                                        {shortcut.title}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : (
                    <div className="mt-8 grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.38fr)] xl:gap-12">
                        <main className="min-w-0 space-y-12">
                            <RuleGroup
                                title="Limites do atacado"
                                subtitle="O que precisa estar certo antes de fechar."
                                rules={limits}
                                selectedRuleId={selectedRule?.id ?? null}
                                categories={categories}
                                products={products}
                                onSelect={setSelectedRuleId}
                                onEdit={openEditEditor}
                                onToggle={toggleRule}
                                onDuplicate={duplicateRule}
                                onDelete={setDeleteRule}
                                emptyLabel="Nenhum limite bloqueando a compra."
                            />
                            <RuleGroup
                                title="Vantagens para o lojista"
                                subtitle="Incentivos que fazem a seleção avançar."
                                rules={benefits}
                                selectedRuleId={selectedRule?.id ?? null}
                                categories={categories}
                                products={products}
                                onSelect={setSelectedRuleId}
                                onEdit={openEditEditor}
                                onToggle={toggleRule}
                                onDuplicate={duplicateRule}
                                onDelete={setDeleteRule}
                                emptyLabel="Crie o primeiro incentivo para o lojista."
                            />
                        </main>

                        {selectedRule && selectedEvaluation && (
                            <aside className="min-w-0 border-l border-border pl-7 xl:sticky xl:top-8 xl:self-start xl:pl-9">
                                <p className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                                    Regra em foco
                                </p>
                                <div className="mt-7 flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-zouth-display text-[clamp(1.75rem,2.1vw,2.1rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-foreground">
                                            {selectedRule.name}
                                            <span className="text-[#ff4d3d]">
                                                .
                                            </span>
                                        </h2>
                                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                            {selectedRule.description ??
                                                ruleSentence(
                                                    selectedRule,
                                                    categories,
                                                    products,
                                                )}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'mt-1 size-2 shrink-0 rounded-full',
                                            selectedRule.is_active
                                                ? 'bg-[#2e705a]'
                                                : 'bg-[#98968d]',
                                        )}
                                        aria-label={
                                            selectedRule.is_active
                                                ? 'Regra ativa'
                                                : 'Regra pausada'
                                        }
                                    />
                                </div>

                                <div className="mt-7 border-t border-border pt-6">
                                    <p className="font-zouth-display text-sm font-semibold text-foreground">
                                        Cenário do carrinho
                                    </p>
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <SimulationInput
                                            label="Subtotal"
                                            value={
                                                simulation.subtotal_cents / 100
                                            }
                                            prefix="R$"
                                            onChange={(value) =>
                                                setSimulation((current) => ({
                                                    ...current,
                                                    subtotal_cents: Math.max(
                                                        0,
                                                        Math.round(value * 100),
                                                    ),
                                                }))
                                            }
                                        />
                                        <SimulationInput
                                            label="Peças"
                                            value={simulation.total_quantity}
                                            onChange={(value) =>
                                                setSimulation((current) => ({
                                                    ...current,
                                                    total_quantity: Math.max(
                                                        1,
                                                        Math.round(value),
                                                    ),
                                                }))
                                            }
                                        />
                                        <SimulationInput
                                            label="Modelos"
                                            value={simulation.distinct_products}
                                            onChange={(value) =>
                                                setSimulation((current) => ({
                                                    ...current,
                                                    distinct_products: Math.max(
                                                        1,
                                                        Math.round(value),
                                                    ),
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="mt-6">
                                        <div className="flex items-end justify-between gap-4">
                                            <span className="text-sm text-muted-foreground">
                                                Subtotal estimado
                                            </span>
                                            <strong className="font-zouth-display text-3xl font-semibold tracking-[-0.04em] text-foreground tabular-nums">
                                                {formatCurrency(
                                                    selectedEvaluation.subtotal_cents,
                                                )}
                                            </strong>
                                        </div>

                                        {progress && (
                                            <div className="mt-5">
                                                <progress
                                                    value={progress.current}
                                                    max={progress.target}
                                                    className="order-rule-progress h-1 w-full"
                                                    aria-label={`${Math.round(progress.ratio * 100)}% da condição atingida`}
                                                />
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    Faltam{' '}
                                                    <strong className="font-semibold text-[#ff4d3d]">
                                                        {selectedRule
                                                            .conditions[0]
                                                            .metric ===
                                                        'subtotal_cents'
                                                            ? formatCurrency(
                                                                  progress.remaining,
                                                              )
                                                            : progress.remaining}
                                                    </strong>{' '}
                                                    para{' '}
                                                    {actionLabel(
                                                        selectedRule.action,
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 border-y border-border py-5">
                                        <p
                                            className={cn(
                                                'flex items-center gap-2 text-sm font-semibold',
                                                selectedStatus?.isPositive
                                                    ? 'text-[#2e705a]'
                                                    : 'text-[#c53024]',
                                            )}
                                        >
                                            {selectedStatus?.isPositive ? (
                                                <Check className="size-4" />
                                            ) : (
                                                <AlertTriangle className="size-4" />
                                            )}
                                            {selectedStatus?.label}
                                        </p>
                                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                            {evaluationMessage(
                                                selectedRule,
                                                selectedRuleEvaluation?.matched ??
                                                    false,
                                                ruleSentence(
                                                    selectedRule,
                                                    categories,
                                                    products,
                                                ),
                                            )}
                                        </p>
                                    </div>

                                    <div className="mt-5 grid gap-2 text-sm">
                                        <PriceRow
                                            label="Subtotal"
                                            value={
                                                selectedEvaluation.subtotal_cents
                                            }
                                        />
                                        <PriceRow
                                            label="Desconto"
                                            value={
                                                selectedEvaluation.discount_cents
                                            }
                                            muted={
                                                selectedEvaluation.discount_cents ===
                                                0
                                            }
                                        />
                                        <PriceRow
                                            label="Total estimado"
                                            value={
                                                selectedEvaluation.total_cents
                                            }
                                            strong
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() =>
                                            openEditEditor(selectedRule)
                                        }
                                        className="mt-7 min-h-12 w-full rounded-[2px] bg-[#18181f] text-[#f6f4f0] hover:-translate-y-px hover:bg-[#18181f]"
                                    >
                                        <Pencil className="size-4" />
                                        Editar regra
                                    </Button>
                                </div>
                            </aside>
                        )}
                    </div>
                )}
            </div>

            <Sheet
                open={editor !== null}
                onOpenChange={(open) => !open && closeEditor()}
            >
                <SheetContent
                    side="right"
                    className="w-full gap-0 overflow-hidden bg-[#f6f4f0] p-0 shadow-none sm:max-w-[860px]"
                >
                    <form
                        onSubmit={submitRule}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <SheetHeader className="border-b border-border px-6 py-8 text-left sm:px-10 sm:py-10">
                            <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                {editor?.mode === 'edit'
                                    ? 'Editar regra'
                                    : 'Nova regra'}
                            </p>
                            <SheetTitle className="mt-3 max-w-2xl font-zouth-display text-[clamp(2.1rem,5vw,4rem)] leading-[0.94] font-semibold tracking-[-0.055em] text-foreground">
                                {form.data.name || 'Acordo comercial'}
                                <span className="text-[#ff4d3d]">.</span>
                            </SheetTitle>
                            <SheetDescription className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                                {editorSentence}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
                            {editor?.mode === 'create' && (
                                <section aria-labelledby="shortcut-title">
                                    <div className="flex items-end justify-between gap-5 border-b border-border pb-4">
                                        <div>
                                            <p
                                                id="shortcut-title"
                                                className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                            >
                                                Comece por um caso comum
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                O atalho abre a frase pronta
                                                para você ajustar.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border-b border-border">
                                        {shortcutMeta.map((shortcut) => {
                                            const Icon = shortcut.icon;
                                            const isCurrent =
                                                editor.shortcut ===
                                                shortcut.key;

                                            return (
                                                <button
                                                    key={shortcut.key}
                                                    type="button"
                                                    onClick={() => {
                                                        form.setData(
                                                            shortcutForm(
                                                                shortcut.key,
                                                                categories,
                                                                products,
                                                            ),
                                                        );
                                                        setEditor({
                                                            mode: 'create',
                                                            shortcut:
                                                                shortcut.key,
                                                        });
                                                    }}
                                                    className={cn(
                                                        'grid min-h-20 w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 border-t border-border px-2 text-left transition-colors first:border-t-0 hover:bg-[#e7e3dc]/45 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]',
                                                        isCurrent &&
                                                            'bg-[#e7e3dc]/35',
                                                    )}
                                                >
                                                    <Icon
                                                        className="size-5 text-[#ff4d3d]"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        <span className="block font-zouth-display text-base font-semibold text-foreground">
                                                            {shortcut.title}
                                                        </span>
                                                        <span className="mt-1 block text-xs text-muted-foreground">
                                                            {
                                                                shortcut.description
                                                            }
                                                        </span>
                                                    </span>
                                                    <ArrowRight
                                                        className="size-4 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            <section
                                aria-labelledby="identity-title"
                                className={cn(
                                    editor?.mode === 'create' && 'mt-12',
                                )}
                            >
                                <p
                                    id="identity-title"
                                    className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                >
                                    Como você chama esta regra?
                                </p>
                                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="rule-name">
                                            Nome da regra
                                        </Label>
                                        <Input
                                            id="rule-name"
                                            value={form.data.name}
                                            onChange={(event) =>
                                                form.setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 h-12 rounded-[2px] bg-transparent shadow-none focus-visible:ring-0"
                                            autoFocus={editor?.mode === 'edit'}
                                        />
                                        <InputError
                                            className="mt-2"
                                            message={form.errors.name}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label htmlFor="rule-description">
                                            Lembrete para sua equipe
                                        </Label>
                                        <Textarea
                                            id="rule-description"
                                            value={form.data.description}
                                            onChange={(event) =>
                                                form.setData(
                                                    'description',
                                                    event.target.value,
                                                )
                                            }
                                            rows={2}
                                            className="mt-2 min-h-24 rounded-[2px] bg-transparent shadow-none focus-visible:ring-0"
                                            placeholder="Por que esta regra existe?"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section
                                aria-labelledby="conditions-title"
                                className="mt-12"
                            >
                                <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-4">
                                    <div>
                                        <p
                                            id="conditions-title"
                                            className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                        >
                                            Se isto acontecer
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            A condição é lida usando os dados
                                            reais do carrinho.
                                        </p>
                                    </div>
                                    {form.data.conditions.length > 1 && (
                                        <div
                                            className="inline-flex border border-border"
                                            aria-label="Modo de combinação"
                                        >
                                            {(
                                                [
                                                    ['all', 'Todas'],
                                                    ['any', 'Qualquer'],
                                                ] as const
                                            ).map(([value, label]) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() =>
                                                        form.setData(
                                                            'match_mode',
                                                            value,
                                                        )
                                                    }
                                                    className={cn(
                                                        'min-h-10 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]',
                                                        form.data.match_mode ===
                                                            value
                                                            ? 'bg-[#18181f] text-[#f6f4f0]'
                                                            : 'text-foreground',
                                                    )}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="divide-y divide-border border-b border-border">
                                    {form.data.conditions.map(
                                        (condition, index) => (
                                            <ConditionEditor
                                                key={index}
                                                condition={condition}
                                                index={index}
                                                canRemove={
                                                    form.data.conditions
                                                        .length > 1
                                                }
                                                products={products}
                                                categories={categories}
                                                errors={form.errors}
                                                onChange={(patch) =>
                                                    updateCondition(
                                                        index,
                                                        patch,
                                                    )
                                                }
                                                onToggleScopeId={(id) =>
                                                    toggleScopeId(index, id)
                                                }
                                                onRemove={() =>
                                                    removeCondition(index)
                                                }
                                            />
                                        ),
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={addCondition}
                                    className="mt-4 min-h-11 rounded-[2px] px-0 text-foreground hover:bg-transparent hover:text-[#c53024]"
                                >
                                    <Plus className="size-4" />
                                    Combinar condições
                                </Button>
                                <InputError
                                    className="mt-2"
                                    message={form.errors.conditions}
                                />
                            </section>

                            <section
                                aria-labelledby="action-title"
                                className="mt-12"
                            >
                                <p
                                    id="action-title"
                                    className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                >
                                    Então faça isto
                                </p>
                                <div className="mt-5 grid border border-border sm:grid-cols-3">
                                    {(
                                        [
                                            [
                                                'block_checkout',
                                                'Bloquear finalização',
                                            ],
                                            [
                                                'percentage_discount',
                                                'Desconto percentual',
                                            ],
                                            ['fixed_discount', 'Desconto fixo'],
                                        ] as Array<
                                            [OrderRuleActionType, string]
                                        >
                                    ).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                                form.setData('action', {
                                                    type: value,
                                                    value:
                                                        value ===
                                                        'block_checkout'
                                                            ? null
                                                            : value ===
                                                                'percentage_discount'
                                                              ? 500
                                                              : 15000,
                                                })
                                            }
                                            className={cn(
                                                'min-h-20 border-b border-border px-4 text-left font-zouth-display text-sm font-semibold last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:border-r sm:border-b-0 sm:last:border-r-0',
                                                form.data.action.type === value
                                                    ? 'bg-[#18181f] text-[#f6f4f0]'
                                                    : 'text-foreground hover:bg-[#e7e3dc]/45',
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {form.data.action.type !== 'block_checkout' && (
                                    <div className="mt-5 max-w-sm">
                                        <Label htmlFor="action-value">
                                            {form.data.action.type ===
                                            'percentage_discount'
                                                ? 'Percentual do desconto'
                                                : 'Valor do desconto'}
                                        </Label>
                                        <div className="relative mt-2">
                                            {form.data.action.type ===
                                                'fixed_discount' && (
                                                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-foreground">
                                                    R$
                                                </span>
                                            )}
                                            <Input
                                                id="action-value"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    (form.data.action.value ??
                                                        0) / 100
                                                }
                                                onChange={(event) =>
                                                    form.setData('action', {
                                                        ...form.data.action,
                                                        value: Math.round(
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ) * 100,
                                                        ),
                                                    })
                                                }
                                                className={cn(
                                                    'h-12 rounded-[2px] bg-transparent shadow-none focus-visible:ring-0',
                                                    form.data.action.type ===
                                                        'fixed_discount' &&
                                                        'pl-12',
                                                )}
                                            />
                                            {form.data.action.type ===
                                                'percentage_discount' && (
                                                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">
                                                    %
                                                </span>
                                            )}
                                        </div>
                                        <InputError
                                            className="mt-2"
                                            message={
                                                form.errors['action.value']
                                            }
                                        />
                                    </div>
                                )}
                            </section>

                            <section
                                aria-labelledby="message-title"
                                className="mt-12"
                            >
                                <p
                                    id="message-title"
                                    className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                >
                                    O que o lojista verá
                                </p>
                                <Label
                                    htmlFor="public-message"
                                    className="sr-only"
                                >
                                    Mensagem no carrinho
                                </Label>
                                <Textarea
                                    id="public-message"
                                    value={form.data.public_message}
                                    onChange={(event) =>
                                        form.setData(
                                            'public_message',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={240}
                                    rows={3}
                                    className="mt-5 min-h-28 rounded-[2px] bg-transparent shadow-none focus-visible:ring-0"
                                    placeholder="Explique o próximo passo com clareza."
                                />
                                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                                    <span>Aparece no carrinho público.</span>
                                    <span>
                                        {form.data.public_message.length}/240
                                    </span>
                                </div>
                                <InputError
                                    className="mt-2"
                                    message={form.errors.public_message}
                                />
                            </section>

                            <section
                                aria-labelledby="preview-title"
                                className="mt-12 border-y border-border py-7"
                            >
                                <p
                                    id="preview-title"
                                    className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                >
                                    Simulação viva
                                </p>
                                <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
                                    <div>
                                        <p className="font-zouth-display text-xl font-semibold tracking-[-0.025em] text-foreground">
                                            {editorStatus.label}
                                            <span className="text-[#ff4d3d]">
                                                .
                                            </span>
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {evaluationMessage(
                                                editorSimulationRule,
                                                editorMatched,
                                                editorSentence,
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs text-muted-foreground">
                                            Total estimado
                                        </p>
                                        <p className="mt-1 font-zouth-display text-3xl font-semibold tracking-[-0.04em] tabular-nums">
                                            {formatCurrency(
                                                editorEvaluation.total_cents,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <div className="mt-8 flex min-h-11 items-center justify-between gap-5">
                                <div>
                                    <p className="font-zouth-display text-sm font-semibold text-foreground">
                                        Regra ativa
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Começa a valer assim que for salva.
                                    </p>
                                </div>
                                <Switch
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData('is_active', checked)
                                    }
                                    aria-label="Ativar regra"
                                />
                            </div>
                        </div>

                        <SheetFooter className="grid border-t border-border bg-[#f6f4f0] p-5 sm:grid-cols-2 sm:px-10 sm:py-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditor}
                                className="min-h-12 rounded-[2px] bg-transparent shadow-none"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff4d3d]"
                            >
                                {form.processing
                                    ? 'Salvando…'
                                    : editor?.mode === 'edit'
                                      ? 'Salvar regra'
                                      : 'Criar regra'}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={deleteRule !== null}
                onOpenChange={(open) => !open && setDeleteRule(null)}
            >
                <AlertDialogContent className="rounded-[2px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esta regra?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ela deixa de aparecer no carrinho, mas os pedidos já
                            realizados continuam com o histórico preservado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-[2px]">
                            Manter regra
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="rounded-[2px] bg-[#b42318] text-white hover:bg-[#b42318]"
                        >
                            Excluir regra
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

function RuleGroup({
    title,
    subtitle,
    rules,
    selectedRuleId,
    categories,
    products,
    onSelect,
    onEdit,
    onToggle,
    onDuplicate,
    onDelete,
    emptyLabel,
}: {
    title: string;
    subtitle: string;
    rules: OrderRuleContract[];
    selectedRuleId: number | null;
    categories: CategoryOption[];
    products: ProductOption[];
    onSelect: (id: number) => void;
    onEdit: (rule: OrderRuleContract) => void;
    onToggle: (rule: OrderRuleContract) => void;
    onDuplicate: (rule: OrderRuleContract) => void;
    onDelete: (rule: OrderRuleContract) => void;
    emptyLabel: string;
}) {
    return (
        <section>
            <div className="flex items-end justify-between gap-5 border-b border-border pb-4">
                <div>
                    <h2 className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                        {title}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {subtitle}
                    </p>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                    {rules.length} {rules.length === 1 ? 'regra' : 'regras'}
                </p>
            </div>

            {rules.length === 0 ? (
                <p className="border-b border-border py-8 text-sm text-muted-foreground">
                    {emptyLabel}
                </p>
            ) : (
                <div>
                    {rules.map((rule, index) => {
                        const isSelected = rule.id === selectedRuleId;

                        return (
                            <article
                                key={rule.id}
                                className={cn(
                                    'group relative border-b border-border transition-colors hover:bg-[#e7e3dc]/35',
                                    isSelected && 'bg-[#e7e3dc]/18',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelect(rule.id)}
                                    aria-pressed={isSelected}
                                    className="grid min-h-[132px] w-full grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-4 px-4 pt-5 pb-16 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:min-h-[108px] sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-5 sm:py-5 sm:pr-32"
                                >
                                    <span className="font-zouth-display text-xl font-medium tracking-[-0.035em] text-muted-foreground tabular-nums">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-zouth-display text-base leading-6 font-semibold tracking-[-0.025em] text-foreground sm:text-lg">
                                            {ruleSentence(
                                                rule,
                                                categories,
                                                products,
                                            )}
                                        </span>
                                        <span className="mt-2 block truncate text-xs text-muted-foreground">
                                            {rule.name}
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            'hidden text-[0.65rem] font-bold tracking-[0.16em] uppercase sm:block',
                                            rule.is_active
                                                ? 'text-[#2e705a]'
                                                : 'text-[#98968d]',
                                        )}
                                    >
                                        {rule.is_active ? 'Ativa' : 'Pausada'}
                                    </span>
                                </button>

                                {isSelected && (
                                    <span className="absolute inset-y-0 left-0 w-1 bg-[#ff4d3d]" />
                                )}

                                <div className="absolute right-2 bottom-2 flex items-center gap-1 sm:top-1/2 sm:right-3 sm:bottom-auto sm:-translate-y-1/2">
                                    <Switch
                                        checked={rule.is_active !== false}
                                        onCheckedChange={() => onToggle(rule)}
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                        aria-label={
                                            rule.is_active
                                                ? `Pausar ${rule.name}`
                                                : `Ativar ${rule.name}`
                                        }
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="min-h-11 min-w-11 rounded-[2px] hover:bg-[#e7e3dc]"
                                                aria-label={`Ações para ${rule.name}`}
                                            >
                                                <MoreHorizontal className="size-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="min-w-52 rounded-[2px] shadow-none"
                                        >
                                            <DropdownMenuItem
                                                className="min-h-11 rounded-[2px]"
                                                onSelect={() => onEdit(rule)}
                                            >
                                                <Pencil className="size-4" />
                                                Editar regra
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="min-h-11 rounded-[2px]"
                                                onSelect={() =>
                                                    onDuplicate(rule)
                                                }
                                            >
                                                <Copy className="size-4" />
                                                Duplicar como pausada
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                className="min-h-11 rounded-[2px]"
                                                onSelect={() => onDelete(rule)}
                                            >
                                                <Trash2 className="size-4" />
                                                Excluir regra
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function ConditionEditor({
    condition,
    index,
    canRemove,
    products,
    categories,
    errors,
    onChange,
    onToggleScopeId,
    onRemove,
}: {
    condition: OrderRuleCondition;
    index: number;
    canRemove: boolean;
    products: ProductOption[];
    categories: CategoryOption[];
    errors: Partial<Record<string, string>>;
    onChange: (patch: Partial<OrderRuleCondition>) => void;
    onToggleScopeId: (id: number) => void;
    onRemove: () => void;
}) {
    const scopeOptions =
        condition.scope_type === 'categories' ? categories : products;

    return (
        <div className="py-6">
            <div className="flex items-center justify-between gap-5">
                <p className="font-zouth-display text-sm font-semibold text-foreground">
                    Condição {String(index + 1).padStart(2, '0')}
                </p>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-[#b42318] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                        aria-label={`Remover condição ${index + 1}`}
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor={`condition-metric-${index}`}>
                        O que observar
                    </Label>
                    <Select
                        value={condition.metric}
                        onValueChange={(value) =>
                            onChange({
                                metric: value as OrderRuleMetric,
                                scope_type:
                                    value === 'distinct_products'
                                        ? null
                                        : condition.scope_type,
                                scope_ids:
                                    value === 'distinct_products'
                                        ? []
                                        : condition.scope_ids,
                            })
                        }
                    >
                        <SelectTrigger
                            id={`condition-metric-${index}`}
                            className="mt-2 h-12 w-full rounded-[2px] bg-transparent shadow-none"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[2px]">
                            {Object.entries(metricLabels).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor={`condition-operator-${index}`}>
                        Comparação
                    </Label>
                    <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                            onChange({
                                operator: value as OrderRuleOperator,
                                max_value:
                                    value === 'between'
                                        ? Math.max(
                                              condition.value + 1,
                                              condition.max_value ??
                                                  condition.value * 2,
                                          )
                                        : null,
                            })
                        }
                    >
                        <SelectTrigger
                            id={`condition-operator-${index}`}
                            className="mt-2 h-12 w-full rounded-[2px] bg-transparent shadow-none"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[2px]">
                            {Object.entries(operatorLabels).map(
                                ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label htmlFor={`condition-value-${index}`}>
                        {condition.operator === 'between'
                            ? 'Começa em'
                            : 'Valor'}
                    </Label>
                    <div className="relative mt-2">
                        {condition.metric === 'subtotal_cents' && (
                            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-foreground">
                                R$
                            </span>
                        )}
                        <Input
                            id={`condition-value-${index}`}
                            type="number"
                            min="0"
                            step={
                                condition.metric === 'subtotal_cents'
                                    ? '0.01'
                                    : '1'
                            }
                            value={numberInputValue(condition, condition.value)}
                            onChange={(event) =>
                                onChange({
                                    value: numberInputToStored(
                                        condition,
                                        event.target.value,
                                    ),
                                })
                            }
                            className={cn(
                                'h-12 rounded-[2px] bg-transparent shadow-none focus-visible:ring-0',
                                condition.metric === 'subtotal_cents' &&
                                    'pl-12',
                            )}
                        />
                    </div>
                    <InputError
                        className="mt-2"
                        message={errors[`conditions.${index}.value`]}
                    />
                </div>

                {condition.operator === 'between' && (
                    <div>
                        <Label htmlFor={`condition-max-${index}`}>
                            Termina em
                        </Label>
                        <div className="relative mt-2">
                            {condition.metric === 'subtotal_cents' && (
                                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-foreground">
                                    R$
                                </span>
                            )}
                            <Input
                                id={`condition-max-${index}`}
                                type="number"
                                min="0"
                                step={
                                    condition.metric === 'subtotal_cents'
                                        ? '0.01'
                                        : '1'
                                }
                                value={numberInputValue(
                                    condition,
                                    condition.max_value ?? condition.value,
                                )}
                                onChange={(event) =>
                                    onChange({
                                        max_value: numberInputToStored(
                                            condition,
                                            event.target.value,
                                        ),
                                    })
                                }
                                className={cn(
                                    'h-12 rounded-[2px] bg-transparent shadow-none focus-visible:ring-0',
                                    condition.metric === 'subtotal_cents' &&
                                        'pl-12',
                                )}
                            />
                        </div>
                        <InputError
                            className="mt-2"
                            message={errors[`conditions.${index}.max_value`]}
                        />
                    </div>
                )}
            </div>

            {condition.metric !== 'distinct_products' && (
                <div className="mt-5 border-t border-border pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="font-zouth-display text-sm font-semibold text-foreground">
                                Recorte da coleção
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Sem recorte, a regra observa o carrinho inteiro.
                            </p>
                        </div>
                        <Select
                            value={condition.scope_type ?? 'all'}
                            onValueChange={(value) =>
                                onChange({
                                    scope_type:
                                        value === 'all'
                                            ? null
                                            : (value as OrderRuleScopeType),
                                    scope_ids: [],
                                })
                            }
                        >
                            <SelectTrigger className="h-11 w-full rounded-[2px] bg-transparent shadow-none sm:w-52">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-[2px]">
                                <SelectItem value="all">
                                    Carrinho inteiro
                                </SelectItem>
                                <SelectItem value="products">
                                    Produtos escolhidos
                                </SelectItem>
                                <SelectItem value="categories">
                                    Categorias escolhidas
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {condition.scope_type && (
                        <div className="mt-4 max-h-48 overflow-y-auto border-y border-border">
                            {scopeOptions.length === 0 ? (
                                <p className="py-5 text-sm text-muted-foreground">
                                    Nenhuma opção disponível nesta coleção.
                                </p>
                            ) : (
                                scopeOptions.map((option) => {
                                    const selected =
                                        condition.scope_ids.includes(option.id);

                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() =>
                                                onToggleScopeId(option.id)
                                            }
                                            className="flex min-h-12 w-full items-center justify-between gap-4 border-b border-border px-2 text-left text-sm last:border-b-0 hover:bg-[#e7e3dc]/45 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                        >
                                            <span className="truncate">
                                                {option.name}
                                            </span>
                                            <span
                                                className={cn(
                                                    'flex size-5 items-center justify-center border',
                                                    selected
                                                        ? 'border-[#ff4d3d] bg-[#ff4d3d] text-[#18181f]'
                                                        : 'border-border',
                                                )}
                                                aria-hidden="true"
                                            >
                                                {selected && (
                                                    <Check className="size-3" />
                                                )}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                    <InputError
                        className="mt-2"
                        message={errors[`conditions.${index}.scope_ids`]}
                    />
                </div>
            )}
        </div>
    );
}

function SimulationInput({
    label,
    value,
    prefix,
    onChange,
}: {
    label: string;
    value: number;
    prefix?: string;
    onChange: (value: number) => void;
}) {
    const id = `simulation-${label.toLowerCase()}`;

    return (
        <div>
            <Label htmlFor={id} className="text-[0.65rem] uppercase">
                {label}
            </Label>
            <div className="relative mt-2">
                {prefix && (
                    <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
                        {prefix}
                    </span>
                )}
                <Input
                    id={id}
                    type="number"
                    min="0"
                    value={value}
                    onChange={(event) => onChange(Number(event.target.value))}
                    className={cn(
                        'h-11 rounded-[2px] bg-transparent text-sm shadow-none focus-visible:ring-0',
                        prefix && 'pl-8',
                    )}
                />
            </div>
        </div>
    );
}

function PriceRow({
    label,
    value,
    muted = false,
    strong = false,
}: {
    label: string;
    value: number;
    muted?: boolean;
    strong?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-center justify-between gap-5',
                strong && 'mt-1 border-t border-border pt-3',
                muted && 'text-muted-foreground',
            )}
        >
            <span className={strong ? 'font-semibold' : undefined}>
                {label}
            </span>
            <span
                className={cn(
                    'tabular-nums',
                    strong && 'font-zouth-display text-lg font-semibold',
                )}
            >
                {formatCurrency(value)}
            </span>
        </div>
    );
}
