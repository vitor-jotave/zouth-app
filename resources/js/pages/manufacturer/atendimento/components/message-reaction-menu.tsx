import { LoaderCircle, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Message, MessageReaction } from '../index';

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
const additionalReactions = ['👏', '🔥', '🎉', '😍', '🤔', '🤝'] as const;

const reactionNames: Record<string, string> = {
    '👍': 'Curtir',
    '❤️': 'Amar',
    '😂': 'Rir',
    '😮': 'Surpresa',
    '😢': 'Triste',
    '🙏': 'Agradecer',
    '👏': 'Aplaudir',
    '🔥': 'Incrível',
    '🎉': 'Comemorar',
    '😍': 'Amei',
    '🤔': 'Pensando',
    '🤝': 'Fechado',
};

interface MessageReactionMenuProps {
    message: Message;
    pending: boolean;
    children: ReactNode;
    onReact: (message: Message, reaction: string) => void;
}

function ReactionOption({
    reaction,
    selected,
    pending,
    onSelect,
}: {
    reaction: string;
    selected: boolean;
    pending: boolean;
    onSelect: () => void;
}) {
    return (
        <ContextMenuItem
            aria-label={reactionNames[reaction] ?? `Reagir com ${reaction}`}
            title={reactionNames[reaction]}
            disabled={pending}
            onSelect={onSelect}
            className={`flex size-8 justify-center rounded-full p-0 text-[1.2rem] leading-none transition-transform duration-150 select-none focus:scale-110 focus:bg-[#ff4d3d]/12 data-[highlighted]:scale-110 data-[highlighted]:bg-[#ff4d3d]/12 sm:size-9 ${selected ? 'bg-[#ff4d3d]/12 ring-2 ring-[#ff4d3d]' : ''}`}
        >
            <span aria-hidden="true">{reaction}</span>
        </ContextMenuItem>
    );
}

function groupedReactions(reactions: MessageReaction[]) {
    return reactions.reduce<
        Array<{ emoji: string; count: number; selectedByMe: boolean }>
    >((groups, reaction) => {
        const existing = groups.find((group) => group.emoji === reaction.emoji);

        if (existing) {
            existing.count += 1;
            existing.selectedByMe ||= reaction.from_me;

            return groups;
        }

        groups.push({
            emoji: reaction.emoji,
            count: 1,
            selectedByMe: reaction.from_me,
        });

        return groups;
    }, []);
}

export function MessageReactionBadges({
    message,
    reactions,
    fromMe,
    pending,
    onReact,
}: {
    message: Message;
    reactions: MessageReaction[];
    fromMe: boolean;
    pending: boolean;
    onReact: (message: Message, reaction: string) => void;
}) {
    const groups = groupedReactions(reactions);

    if (groups.length === 0) {
        return null;
    }

    return (
        <div
            aria-label={`Reações: ${groups
                .map(
                    (group) =>
                        `${reactionNames[group.emoji] ?? group.emoji}${group.count > 1 ? `, ${group.count}` : ''}`,
                )
                .join('; ')}`}
            className={`absolute -bottom-3 z-10 flex items-center gap-1 ${fromMe ? 'right-2' : 'left-2'}`}
        >
            {groups.map((group) => {
                const content = (
                    <>
                        <span aria-hidden="true">{group.emoji}</span>
                        {group.count > 1 && (
                            <span className="text-[0.6rem] font-semibold text-[#cac4ba]">
                                {group.count}
                            </span>
                        )}
                    </>
                );
                const className = `flex h-6 min-w-7 items-center justify-center gap-0.5 rounded-full border bg-[#222128] px-1.5 text-sm leading-none shadow-[0_4px_12px_rgba(0,0,0,0.28)] ${group.selectedByMe ? 'border-[#ff4d3d]' : 'border-[#f6f4f0]/18'} ${pending ? 'animate-pulse' : ''}`;

                return group.selectedByMe ? (
                    <button
                        key={group.emoji}
                        type="button"
                        aria-label={`Remover reação ${reactionNames[group.emoji] ?? group.emoji}`}
                        title="Clique para remover sua reação"
                        disabled={pending}
                        onClick={(event) => {
                            event.stopPropagation();
                            onReact(message, group.emoji);
                        }}
                        className={`${className} cursor-pointer transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] disabled:cursor-wait`}
                    >
                        {content}
                    </button>
                ) : (
                    <span key={group.emoji} className={className}>
                        {content}
                    </span>
                );
            })}
        </div>
    );
}

export function MessageReactionMenu({
    message,
    pending,
    children,
    onReact,
}: MessageReactionMenuProps) {
    const selectedReaction = message.reactions.find(
        (reaction) => reaction.from_me,
    )?.emoji;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent
                aria-label="Reagir à mensagem"
                className="flex min-w-0 items-center gap-px rounded-full border-[#18181f]/8 bg-[#f6f4f0] p-1.5 text-[#18181f] shadow-[0_14px_42px_rgba(0,0,0,0.3)]"
            >
                {quickReactions.map((reaction) => (
                    <ReactionOption
                        key={reaction}
                        reaction={reaction}
                        selected={selectedReaction === reaction}
                        pending={pending}
                        onSelect={() => onReact(message, reaction)}
                    />
                ))}
                <ContextMenuSub>
                    <ContextMenuSubTrigger
                        aria-label="Mais reações"
                        title="Mais reações"
                        disabled={pending}
                        className="flex size-8 justify-center rounded-full p-0 focus:bg-[#18181f]/8 data-[state=open]:bg-[#18181f]/8 sm:size-9 [&>svg:last-child]:hidden"
                    >
                        {pending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4.5" />
                        )}
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="flex min-w-0 items-center gap-px rounded-full border-[#18181f]/8 bg-[#f6f4f0] p-1.5 text-[#18181f] shadow-[0_14px_42px_rgba(0,0,0,0.3)]">
                        {additionalReactions.map((reaction) => (
                            <ReactionOption
                                key={reaction}
                                reaction={reaction}
                                selected={selectedReaction === reaction}
                                pending={pending}
                                onSelect={() => onReact(message, reaction)}
                            />
                        ))}
                    </ContextMenuSubContent>
                </ContextMenuSub>
            </ContextMenuContent>
        </ContextMenu>
    );
}
