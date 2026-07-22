import {
    Clock3,
    Filter,
    GripVertical,
    MessageSquare,
    Route,
    UserRoundCheck,
    type LucideIcon,
} from 'lucide-react';
import type { AutomationMovement } from '../automation-types';
import { movementGroups } from '../automation-types';

const movementIcons: Record<AutomationMovement, LucideIcon> = {
    message_received: MessageSquare,
    client_replied: UserRoundCheck,
    message_contains: Filter,
    send_funnel: Route,
    wait_reply: Clock3,
};

const groupToneClasses = {
    coral: 'text-[#ff6a5c]',
    plum: 'text-[#c99bcc]',
    sand: 'text-[#e2b95f]',
} as const;

interface AutomationMovementLibraryProps {
    onAddMovement: (movement: AutomationMovement) => void;
}

export function AutomationMovementLibrary({
    onAddMovement,
}: AutomationMovementLibraryProps) {
    return (
        <aside className="h-full min-h-0 overflow-y-auto border-r border-[#f6f4f0]/12 bg-[#141419] px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div>
                <p className="text-[0.66rem] font-bold tracking-[0.18em] text-[#cac4ba] uppercase">
                    Movimentos
                </p>
                <p className="mt-2 text-xs leading-5 text-[#77746d]">
                    Arraste para o quadro ou clique para adicionar.
                </p>
            </div>

            <div className="mt-7 space-y-7">
                {movementGroups.map((group) => (
                    <section key={group.label}>
                        <h2
                            className={`text-[0.6rem] font-bold tracking-[0.16em] uppercase ${groupToneClasses[group.tone]}`}
                        >
                            {group.label}
                        </h2>
                        <div className="mt-3 space-y-2">
                            {group.options.map((option) => {
                                const Icon = movementIcons[option.movement];

                                return (
                                    <button
                                        key={option.movement}
                                        type="button"
                                        draggable
                                        onDragStart={(event) => {
                                            event.dataTransfer.effectAllowed =
                                                'copy';
                                            event.dataTransfer.setData(
                                                'application/zouth-automation-movement',
                                                option.movement,
                                            );
                                        }}
                                        onClick={() =>
                                            onAddMovement(option.movement)
                                        }
                                        className="group flex min-h-14 w-full items-center gap-2.5 border border-[#f6f4f0]/14 bg-[#18181f] px-3 text-left text-[0.78rem] leading-4 text-[#cac4ba] transition-colors hover:border-[#ff4d3d]/65 hover:text-[#f6f4f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                    >
                                        <Icon className="size-4 shrink-0 text-[#f6f4f0] transition-colors group-hover:text-[#ff4d3d]" />
                                        <span className="min-w-0 flex-1">
                                            {option.title}
                                        </span>
                                        <GripVertical className="size-4 shrink-0 text-[#67645e]" />
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </aside>
    );
}
