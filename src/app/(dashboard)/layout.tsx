import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
        
        <footer className="p-8 border-t border-slate-900 text-center">
          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} TSCOPE. Todos os direitos reservados.
          </p>
        </footer>
      </main>
    </div>
  );
}
