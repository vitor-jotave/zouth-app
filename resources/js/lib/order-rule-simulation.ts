import type {
    OrderRuleCartItem,
    OrderRuleCondition,
    OrderRuleAction,
} from '@/lib/order-rules';

export function orderRuleSimulationIssue(
    conditions: OrderRuleCondition[],
    action: OrderRuleAction,
): string | null {
    if (conditions.length === 0) return 'Inclua uma condição antes de simular.';
    if (
        conditions.some(
            (condition) =>
                condition.scope_type && condition.scope_ids.length === 0,
        )
    )
        return 'Escolha ao menos um produto ou categoria para o recorte.';
    if (
        conditions.some(
            (condition) =>
                condition.value <= 0 ||
                (condition.operator === 'between' &&
                    (condition.max_value === null ||
                        condition.max_value < condition.value)),
        )
    )
        return 'Complete os valores da condição antes de simular.';
    if (action.type !== 'block_checkout' && (!action.value || action.value < 1))
        return 'Informe o desconto antes de simular.';
    return null;
}
export interface RuleSimulationProduct {
    id: number;
    product_category_id: number | null;
    price_cents: number | null;
    components?: OrderRuleCartItem['components'];
}
export type RuleSimulationSelection = Record<
    number,
    { quantity: number; unit_price_cents: number | null }
>;
export function buildRuleSimulation(
    products: RuleSimulationProduct[],
    selection: RuleSimulationSelection,
): OrderRuleCartItem[] {
    return products.flatMap((product) => {
        const item = selection[product.id];
        if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1)
            return [];
        return [
            {
                product_id: product.id,
                product_category_id: product.product_category_id,
                quantity: item.quantity,
                unit_price_cents: item.unit_price_cents,
                components: product.components,
            },
        ];
    });
}
