import type { ReactNode } from 'react';

interface IphoneFrameProps {
    children: ReactNode;
    backgroundColor?: string;
}

export default function IphoneFrame({ children, backgroundColor = '#ffffff' }: IphoneFrameProps) {
    return (
        <div className="relative mx-auto w-full max-w-[375px]">
            {/* Device bezel/frame */}
            <div className="relative rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 shadow-2xl ring-1 ring-white/10">
                {/* Dynamic Island */}
                <div className="absolute left-1/2 top-6 z-20 h-8 w-32 -translate-x-1/2 rounded-full bg-black shadow-lg" />
                
                {/* Screen */}
                <div className="relative overflow-hidden rounded-[2.5rem]" style={{ backgroundColor }}>
                    {/* Status bar area (safe area top) */}
                    <div className="relative h-full w-full overflow-y-auto" style={{ maxHeight: '660px', minHeight: '660px' }}>
                        {/* Safe area top padding for Dynamic Island */}
                        <div className="h-12" />
                        
                        {/* Content */}
                        <div className="h-full pb-8">
                            {children}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom indicator (home gesture bar) */}
            <div className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/30" />
        </div>
    );
}
