import {
    Clock3,
    Filter,
    Hand,
    MessageSquare,
    Minus,
    Plus,
    Route,
    Scan,
    UserRoundCheck,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    AutomationDefinition,
    AutomationMovement,
    AutomationNode,
} from '../automation-types';

const NODE_WIDTH = 208;
const NODE_HEIGHT = 132;

const movementIcons: Record<AutomationMovement, LucideIcon> = {
    message_received: MessageSquare,
    client_replied: UserRoundCheck,
    message_contains: Filter,
    send_funnel: Route,
    wait_reply: Clock3,
};

const kindLabels = {
    trigger: 'Quando acontece',
    condition: 'Se',
    action: 'Faça',
} as const;

const toneClasses = {
    trigger: {
        border: 'border-[#ff4d3d]/65',
        icon: 'border-[#ff4d3d]/45 bg-[#ff4d3d] text-[#18181f]',
        label: 'text-[#ff6a5c]',
    },
    condition: {
        border: 'border-[#aa73ad]/60',
        icon: 'border-[#aa73ad]/45 bg-[#39263b] text-[#ead7ec]',
        label: 'text-[#c99bcc]',
    },
    action: {
        border: 'border-[#f6f4f0]/28',
        icon: 'border-[#f6f4f0]/20 bg-[#2a292e] text-[#f6f4f0]',
        label: 'text-[#cac4ba]',
    },
} as const;

interface AutomationCanvasProps {
    definition: AutomationDefinition;
    selectedNodeId: string | null;
    testingNodeId: string | null;
    onSelectNode: (nodeId: string) => void;
    onMoveNode: (nodeId: string, x: number, y: number) => void;
    onDropMovement: (
        movement: AutomationMovement,
        x: number,
        y: number,
    ) => void;
}

interface DragState {
    nodeId: string;
    pointerId: number;
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
}

export function AutomationCanvas({
    definition,
    selectedNodeId,
    testingNodeId,
    onSelectNode,
    onMoveNode,
    onDropMovement,
}: AutomationCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [zoom, setZoom] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const nodesById = useMemo(
        () => new Map(definition.nodes.map((node) => [node.id, node])),
        [definition.nodes],
    );

    const drawConnections = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) {
            return;
        }

        const density = window.devicePixelRatio || 1;
        canvas.width = canvasSize.width * density;
        canvas.height = canvasSize.height * density;
        canvas.style.width = `${canvasSize.width}px`;
        canvas.style.height = `${canvasSize.height}px`;

        const context = canvas.getContext('2d');

        if (!context) {
            return;
        }

        context.scale(density, density);
        context.clearRect(0, 0, canvasSize.width, canvasSize.height);
        context.lineWidth = 1.25;

        definition.edges.forEach((edge) => {
            const from = nodesById.get(edge.from);
            const to = nodesById.get(edge.to);

            if (!from || !to) {
                return;
            }

            const startX = (from.position.x + NODE_WIDTH) * zoom;
            const startY = (from.position.y + NODE_HEIGHT / 2) * zoom;
            const endX = to.position.x * zoom;
            const endY = (to.position.y + NODE_HEIGHT / 2) * zoom;
            const curve = Math.max(42, Math.abs(endX - startX) * 0.52);

            context.beginPath();
            context.moveTo(startX, startY);
            context.bezierCurveTo(
                startX + curve,
                startY,
                endX - curve,
                endY,
                endX,
                endY,
            );
            context.strokeStyle =
                edge.branch === 'sim'
                    ? 'rgba(67, 201, 121, 0.68)'
                    : edge.branch === 'não'
                      ? 'rgba(202, 196, 186, 0.52)'
                      : 'rgba(255, 77, 61, 0.52)';
            context.stroke();
        });
    }, [canvasSize, definition.edges, nodesById, zoom]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const updateSize = () => {
            setCanvasSize({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        };
        const observer = new ResizeObserver(updateSize);

        updateSize();
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        drawConnections();
    }, [drawConnections]);

    const handlePointerDown = (
        event: React.PointerEvent<HTMLButtonElement>,
        node: AutomationNode,
    ) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            nodeId: node.id,
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            startX: node.position.x,
            startY: node.position.y,
        };
        onSelectNode(node.id);
    };

    const handlePointerMove = (
        event: React.PointerEvent<HTMLButtonElement>,
    ) => {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }

        const availableWidth = Math.max(
            NODE_WIDTH + 32,
            canvasSize.width / zoom,
        );
        const availableHeight = Math.max(
            NODE_HEIGHT + 32,
            canvasSize.height / zoom,
        );
        const x = Math.min(
            availableWidth - NODE_WIDTH - 16,
            Math.max(16, drag.startX + (event.clientX - drag.clientX) / zoom),
        );
        const y = Math.min(
            availableHeight - NODE_HEIGHT - 16,
            Math.max(16, drag.startY + (event.clientY - drag.clientY) / zoom),
        );

        onMoveNode(drag.nodeId, Math.round(x), Math.round(y));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
        }
    };

    return (
        <div
            ref={containerRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
                event.preventDefault();
                const movement = event.dataTransfer.getData(
                    'application/zouth-automation-movement',
                ) as AutomationMovement;
                const bounds = event.currentTarget.getBoundingClientRect();

                if (!movementIcons[movement]) {
                    return;
                }

                onDropMovement(
                    movement,
                    Math.max(16, (event.clientX - bounds.left) / zoom - 104),
                    Math.max(16, (event.clientY - bounds.top) / zoom - 66),
                );
            }}
            className="relative h-full min-h-0 min-w-0 overflow-hidden bg-[#101015]"
            style={{
                backgroundImage:
                    'radial-gradient(circle, rgba(246,244,240,0.12) 0.8px, transparent 0.9px)',
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            }}
        >
            <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
            />

            <p className="pointer-events-none absolute top-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 text-xs whitespace-nowrap text-[#98968d]">
                <Hand className="size-4" />
                Arraste para mover
                <span className="text-[#67645e]">·</span>
                Clique para configurar
            </p>

            {definition.edges
                .filter((edge) => edge.branch)
                .map((edge) => {
                    const from = nodesById.get(edge.from);
                    const to = nodesById.get(edge.to);

                    if (!from || !to) {
                        return null;
                    }

                    const x =
                        (from.position.x +
                            NODE_WIDTH +
                            (to.position.x - from.position.x - NODE_WIDTH) *
                                0.45) *
                        zoom;
                    const y =
                        (from.position.y +
                            NODE_HEIGHT / 2 +
                            (to.position.y - from.position.y) * 0.3) *
                        zoom;

                    return (
                        <span
                            key={edge.id}
                            className={`pointer-events-none absolute z-10 -translate-y-1/2 border bg-[#101015] px-2 py-1 text-[0.6rem] font-bold tracking-[0.12em] uppercase ${
                                edge.branch === 'sim'
                                    ? 'border-[#43c979]/35 text-[#43c979]'
                                    : 'border-[#f6f4f0]/18 text-[#cac4ba]'
                            }`}
                            style={{ left: x, top: y }}
                        >
                            {edge.branch}
                        </span>
                    );
                })}

            {definition.nodes.map((node) => {
                const Icon = movementIcons[node.movement];
                const tone = toneClasses[node.kind];
                const selected = selectedNodeId === node.id;
                const testing = testingNodeId === node.id;

                return (
                    <button
                        key={node.id}
                        type="button"
                        onPointerDown={(event) =>
                            handlePointerDown(event, node)
                        }
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`absolute z-20 touch-none border bg-[#18181f]/96 p-3 text-left transition-[border-color,box-shadow,opacity] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff4d3d] ${tone.border} ${
                            selected
                                ? 'border-[#ff4d3d] shadow-[0_0_0_1px_rgba(255,77,61,0.2)]'
                                : 'hover:border-[#f6f4f0]/45'
                        } ${testing ? 'border-[#43c979] shadow-[0_0_24px_rgba(67,201,121,0.18)]' : ''}`}
                        style={{
                            left: node.position.x * zoom,
                            top: node.position.y * zoom,
                            width: NODE_WIDTH,
                            height: NODE_HEIGHT,
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top left',
                        }}
                        aria-label={`${node.data.title}. ${node.data.summary ?? ''}`}
                    >
                        <span className="flex h-full gap-3">
                            <span
                                className={`flex size-11 shrink-0 items-center justify-center border ${tone.icon}`}
                            >
                                <Icon className="size-5" />
                            </span>
                            <span className="min-w-0 pt-0.5">
                                <span
                                    className={`block text-[0.62rem] font-bold tracking-[0.16em] uppercase ${tone.label}`}
                                >
                                    {kindLabels[node.kind]}
                                </span>
                                <span className="mt-2 block font-zouth-display text-base leading-tight font-semibold tracking-[-0.025em] text-[#f6f4f0]">
                                    {node.data.title}
                                </span>
                                <span className="mt-1.5 block max-h-[1.8rem] overflow-hidden text-[0.68rem] leading-[0.9rem] text-[#98968d]">
                                    {node.data.summary}
                                </span>
                            </span>
                        </span>
                        <span className="absolute top-1/2 -left-1.5 size-3 -translate-y-1/2 rounded-full border border-[#f6f4f0]/60 bg-[#18181f]" />
                        <span className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rounded-full border border-[#f6f4f0]/60 bg-[#18181f]" />
                    </button>
                );
            })}

            <div className="absolute bottom-5 left-5 z-30 flex items-center border border-[#f6f4f0]/14 bg-[#18181f]">
                <button
                    type="button"
                    onClick={() =>
                        setZoom((value) => Math.max(0.75, value - 0.1))
                    }
                    className="flex size-10 items-center justify-center border-r border-[#f6f4f0]/14 text-[#cac4ba] hover:text-[#ff4d3d] focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                    aria-label="Diminuir zoom"
                >
                    <Minus className="size-4" />
                </button>
                <span className="min-w-14 text-center text-xs text-[#cac4ba]">
                    {Math.round(zoom * 100)}%
                </span>
                <button
                    type="button"
                    onClick={() =>
                        setZoom((value) => Math.min(1.25, value + 0.1))
                    }
                    className="flex size-10 items-center justify-center border-l border-[#f6f4f0]/14 text-[#cac4ba] hover:text-[#ff4d3d] focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                    aria-label="Aumentar zoom"
                >
                    <Plus className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="flex size-10 items-center justify-center border-l border-[#f6f4f0]/14 text-[#cac4ba] hover:text-[#ff4d3d] focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                    aria-label="Restaurar visualização"
                >
                    <Scan className="size-4" />
                </button>
            </div>
        </div>
    );
}
