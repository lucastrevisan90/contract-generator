import React from 'react';
import { LayoutList, Calendar as CalendarIcon, CheckSquare, BarChart3, Shield } from 'lucide-react';

interface MobileTabBarProps {
    viewMode: string;
    setViewMode: (mode: any) => void;
    isAdmin: boolean;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ viewMode, setViewMode, isAdmin }) => {
    const navItems = [
        { id: 'nav-day', mode: 'day', icon: LayoutList, label: 'Hoje' },
        { id: 'nav-month', mode: 'month', icon: CalendarIcon, label: 'Mês' },
        { id: 'nav-habits', mode: 'habits', icon: CheckSquare, label: 'Hábitos' },
        { id: 'nav-stats', mode: 'stats', icon: BarChart3, label: 'Status' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background-secondary/95 backdrop-blur-md border-t border-border z-40 px-2 pb-safe" id="nav-views">
            <div className="flex items-center justify-around">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        id={item.id} // Reusing the same IDs so Joyride finds them!
                        onClick={() => setViewMode(item.mode)}
                        className={`flex flex-col items-center justify-center w-full py-3 min-h-[56px] transition-all ${viewMode === item.mode
                            ? 'text-blue-500'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${viewMode === item.mode ? 'bg-blue-500/10' : ''}`}>
                            <item.icon size={24} strokeWidth={viewMode === item.mode ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] mt-1 font-medium ${viewMode === item.mode ? 'font-bold' : ''}`}>
                            {item.label}
                        </span>
                    </button>
                ))}

                {isAdmin && (
                    <button
                        onClick={() => setViewMode('admin')}
                        className={`flex flex-col items-center justify-center w-full py-3 min-h-[56px] transition-all ${viewMode === 'admin'
                            ? 'text-amber-500'
                            : 'text-slate-400 hover:text-amber-500'
                            }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${viewMode === 'admin' ? 'bg-amber-500/10' : ''}`}>
                            <Shield size={24} strokeWidth={viewMode === 'admin' ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] mt-1 font-medium ${viewMode === 'admin' ? 'font-bold' : ''}`}>
                            Admin
                        </span>
                    </button>
                )}
            </div>
        </nav>
    );
};
