export type OrderRuleMetric =
    | 'subtotal_cents'
    | 'total_quantity'
    | 'distinct_products';

export type OrderRuleOperator = 'gte' | 'lte' | 'eq' | 'between';
export type OrderRuleMatchMode = 'all' | 'any';
export type OrderRuleActionType =
    | 'block_checkout'
    | 'percentage_discount'
    | 'fixed_discount';
export type OrderRuleScopeType = 'products' | 'categories' | null;

export type OrderRuleCondition = {
    metric: OrderRuleMetric;
    operator: OrderRuleOperator;
    value: number;
    max_value: number | null;
    scope_type: OrderRuleScopeType;
    scope_ids: number[];
};

export type OrderRuleAction = {
    type: OrderRuleActionType;
    value: number | null;
};

export type OrderRuleContract = {
    id: number;
    name: string;
    description?: string | null;
    is_active?: boolean;
    match_mode: OrderRuleMatchMode;
    conditions: OrderRuleCondition[];
    action: OrderRuleAction;
    public_message?: string | null;
    sort_order?: number;
    created_at?: string;
    updated_at?: string;
};

export type OrderRuleCartItem = {
    product_id: number;
    product_category_id: number | null;
    quantity: number;
    unit_price_cents: number | null;
};

export type OrderRuleEvaluation = {
    rule: OrderRuleContract;
    matched: boolean;
    current_values: number[];
    discount_cents: number;
};

export type OrderRuleCartEvaluation = {
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    is_blocked: boolean;
    blocking_messages: string[];
    best_discount_rule: OrderRuleContract | null;
    evaluations: OrderRuleEvaluation[];
};

function scopedItems(
    condition: OrderRuleCondition,
    items: OrderRuleCartItem[],
): OrderRuleCartItem[] {
    if (!condition.scope_type || condition.scope_ids.length === 0) {
        return items;
    }

    return items.filter((item) =>
        condition.scope_type === 'products'
            ? condition.scope_ids.includes(item.product_id)
            : item.product_category_id !== null &&
              condition.scope_ids.includes(item.product_category_id),
    );
}

export function orderRuleMetricValue(
    condition: OrderRuleCondition,
    items: OrderRuleCartItem[],
): number {
    const relevantItems = scopedItems(condition, items);

    if (condition.metric === 'subtotal_cents') {
        return relevantItems.reduce(
            (total, item) =>
                total + (item.unit_price_cents ?? 0) * item.quantity,
            0,
        );
    }

    if (condition.metric === 'total_quantity') {
        return relevantItems.reduce((total, item) => total + item.quantity, 0);
    }

    return new Set(relevantItems.map((item) => item.product_id)).size;
}

export function orderRuleConditionMatches(
    condition: OrderRuleCondition,
    items: OrderRuleCartItem[],
): boolean {
    const current = orderRuleMetricValue(condition, items);

    if (condition.operator === 'gte') return current >= condition.value;
    if (condition.operator === 'lte') return current <= condition.value;
    if (condition.operator === 'eq') return current === condition.value;

    return (
        current >= condition.value &&
        current <= (condition.max_value ?? condition.value)
    );
}

export function evaluateOrderRules(
    rules: OrderRuleContract[],
    items: OrderRuleCartItem[],
): OrderRuleCartEvaluation {
    const subtotal = items.reduce(
        (total, item) => total + (item.unit_price_cents ?? 0) * item.quantity,
        0,
    );
    const evaluations: OrderRuleEvaluation[] = [];
    const blockingMessages: string[] = [];
    let bestDiscount = 0;
    let bestDiscountRule: OrderRuleContract | null = null;

    [...rules]
        .filter((rule) => rule.is_active !== false)
        .sort((a, b) => a.id - b.id)
        .forEach((rule) => {
            const results = rule.conditions.map((condition) => ({
                matched: orderRuleConditionMatches(condition, items),
                current: orderRuleMetricValue(condition, items),
            }));
            const matched =
                rule.match_mode === 'any'
                    ? results.some((result) => result.matched)
                    : results.every((result) => result.matched);
            let discount = 0;

            if (matched && rule.action.type === 'percentage_discount') {
                discount = Math.min(
                    subtotal,
                    Math.round(subtotal * ((rule.action.value ?? 0) / 10_000)),
                );
            }

            if (matched && rule.action.type === 'fixed_discount') {
                discount = Math.min(subtotal, rule.action.value ?? 0);
            }

            evaluations.push({
                rule,
                matched,
                current_values: results.map((result) => result.current),
                discount_cents: discount,
            });

            if (matched && rule.action.type === 'block_checkout') {
                blockingMessages.push(
                    rule.public_message ??
                        'Este pedido ainda não atende aos limites do fabricante.',
                );
            }

            if (discount > bestDiscount) {
                bestDiscount = discount;
                bestDiscountRule = rule;
            }
        });

    return {
        subtotal_cents: subtotal,
        discount_cents: bestDiscount,
        total_cents: Math.max(0, subtotal - bestDiscount),
        is_blocked: blockingMessages.length > 0,
        blocking_messages: [...new Set(blockingMessages)],
        best_discount_rule: bestDiscountRule,
        evaluations,
    };
}

export function pendingRuleProgress(evaluation: OrderRuleEvaluation): {
    current: number;
    target: number;
    remaining: number;
    ratio: number;
} | null {
    if (evaluation.matched || evaluation.rule.conditions.length !== 1) {
        return null;
    }

    const condition = evaluation.rule.conditions[0];

    if (condition.operator !== 'gte') {
        return null;
    }

    const current = evaluation.current_values[0] ?? 0;
    const target = condition.value;

    return {
        current,
        target,
        remaining: Math.max(0, target - current),
        ratio: target > 0 ? Math.min(1, current / target) : 1,
    };
}
