export function reportPeriodError(
    start: string,
    end: string,
    today: string,
): string | null {
    if (!start || !end) {
        return 'Informe o início e o fim do período.';
    }
    if (start > end) {
        return 'O início precisa ser anterior ou igual ao fim do período.';
    }
    if (end > today) {
        return 'O período não pode terminar no futuro.';
    }
    return null;
}
