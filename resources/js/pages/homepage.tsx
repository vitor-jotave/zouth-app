import { Head, Link, usePage } from '@inertiajs/react';
import { 
  ChevronRight, 
  Smartphone, 
  Zap, 
  BarChart3, 
  FileWarning, 
  CheckCircle2, 
  Users, 
  Layers, 
  MessageSquare, 
  Menu,
  X,
  Plus,
  Minus,
  Layout,
  MousePointer2,
  Printer
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';

const Navbar = ({ auth, canRegister = true }: { auth: SharedData['auth'], canRegister?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#c1554c] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Zouth <span className="text-[#c1554c]">Suíte</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#solucao" className="text-sm font-medium text-slate-600 hover:text-[#c1554c] transition-colors">Solução</a>
          <a href="#personas" className="text-sm font-medium text-slate-600 hover:text-[#c1554c] transition-colors">Para quem?</a>
          <a href="#beneficios" className="text-sm font-medium text-slate-600 hover:text-[#c1554c] transition-colors">Benefícios</a>
          <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-[#c1554c] transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {auth.user ? (
            <Link
              href={dashboard()}
              className="bg-[#c1554c] hover:bg-[#a84741] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={login()}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Entrar
              </Link>
              {canRegister && (
                <Link
                  href={register()}
                  className="bg-[#c1554c] hover:bg-[#a84741] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Cadastre-se
                </Link>
              )}
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 p-6 absolute w-full flex flex-col gap-4 shadow-xl">
          <a href="#solucao" className="font-medium text-slate-700" onClick={() => setIsOpen(false)}>Solução</a>
          <a href="#personas" className="font-medium text-slate-700" onClick={() => setIsOpen(false)}>Para quem?</a>
          <a href="#beneficios" className="font-medium text-slate-700" onClick={() => setIsOpen(false)}>Benefícios</a>
          {auth.user ? (
            <Link
              href={dashboard()}
              className="bg-[#c1554c] text-white py-3 rounded-xl font-semibold text-center"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href={login()}
                className="font-semibold text-slate-700 py-3 text-center"
              >
                Log in
              </Link>
              {canRegister && (
                <Link
                  href={register()}
                  className="bg-[#c1554c] text-white py-3 rounded-xl font-semibold text-center"
                >
                  Register
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-slate-50 rounded-bl-[100px] opacity-50" />
      <div className="absolute top-40 left-10 -z-10 w-64 h-64 bg-[#fce8e6] rounded-full blur-3xl opacity-30" />
      
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#fef5f4] text-[#a84741] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Zap size={14} /> Foco em Atacado Infantil
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            Substitua seus <span className="text-[#c1554c]">PDFs</span> por um Showroom Digital Premium.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
            Zouth Suíte é o catálogo digital vivo e rastreável feito para fabricantes e representantes de moda infantil. Menos caos de versões, mais pedidos fechados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-[#c1554c] hover:bg-[#a84741] text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:translate-y-[-2px]">
              Ver Demo do Catálogo <ChevronRight size={20} />
            </button>
            <button className="bg-white border border-slate-200 hover:border-[#c1554c] text-slate-700 px-8 py-4 rounded-full font-bold text-lg transition-all">
              Agendar Tour Guiado
            </button>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500" /> Multi-tenant</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500" /> Links Rastreáveis</span>
          </div>
        </div>

        <div className="relative">
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-4 border border-slate-100">
            <div className="bg-slate-50 rounded-2xl overflow-hidden aspect-[4/3] relative group">
              {/* Mockup do App */}
              <div className="absolute inset-0 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="w-1/2 h-6 bg-slate-200 rounded animate-pulse" />
                  <div className="w-10 h-10 bg-[#fce8e6] rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-white rounded-xl shadow-sm border border-slate-100 p-3">
                    <div className="w-full h-2/3 bg-[#fef5f4] rounded-lg mb-2" />
                    <div className="w-full h-2 bg-slate-100 rounded mb-1" />
                    <div className="w-2/3 h-2 bg-slate-100 rounded" />
                  </div>
                  <div className="aspect-square bg-white rounded-xl shadow-sm border border-slate-100 p-3">
                    <div className="w-full h-2/3 bg-[#fef5f4] rounded-lg mb-2" />
                    <div className="w-full h-2 bg-slate-100 rounded mb-1" />
                    <div className="w-2/3 h-2 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
              {/* Overlay interativo flutuante */}
              <div className="absolute top-1/2 -right-10 transform -translate-y-1/2 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden md:block w-48 animate-bounce-slow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <BarChart3 size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Acessos Hoje</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">+184</div>
                <div className="text-[10px] text-green-600 font-bold">Lojista: Kids Store SP</div>
              </div>
            </div>
          </div>
          {/* Sombra de fundo */}
          <div className="absolute -bottom-6 -left-6 w-full h-full bg-[#c1554c]/5 rounded-3xl -z-10" />
        </div>
      </div>
    </section>
  );
};

const Logos = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 border-y border-slate-100">
      <p className="text-center text-slate-400 text-sm font-bold uppercase tracking-widest mb-10">
        Fabricantes que já profissionalizaram seu atacado
      </p>
      <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
        <span className="text-2xl font-black text-slate-800">BABY&CO</span>
        <span className="text-2xl font-black text-slate-800">KIDSVIBE</span>
        <span className="text-2xl font-black text-slate-800">MINI-MODA</span>
        <span className="text-2xl font-black text-slate-800">TINYSTYLE</span>
        <span className="text-2xl font-black text-slate-800">SOFTWEAR</span>
      </div>
    </div>
  );
};

const Problem = () => {
  return (
    <section className="py-24 bg-slate-900 text-white overflow-hidden relative" id="solucao">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            O "caos do PDF" está matando suas vendas no atacado.
          </h2>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            Arquivos pesados que travam no 4G, lojistas perdidos em versões desatualizadas e representantes vendendo itens sem grade ou com preços errados. 
            <strong> Se sua vitrine é um PDF improvisado, você está perdendo lucro.</strong>
          </p>
          
          <div className="space-y-6">
            {[
              "Catálogo_2024_final_v3.pdf circulando no mercado.",
              "Lojistas reclamando que 'aquele modelo não existe'.",
              "Reps carregando pastas pesadas e desorganizadas.",
              "Zero rastreio: você não sabe quem abre seus materiais.",
              "Custos altíssimos com impressão e retrabalho."
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <FileWarning className="text-red-400 shrink-0" size={20} />
                <span className="text-slate-300 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#c1554c]/20 text-[#d88a85] rounded-xl flex items-center justify-center">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Zouth resolve isso</h3>
              <p className="text-sm text-slate-400">Um catálogo vivo, sempre atualizado.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-[#c1554c] transition-all cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-semibold">Atualização em Tempo Real</span>
              </div>
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-[#c1554c] transition-all cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-semibold">Links Rastreáveis por Rep</span>
              </div>
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-[#c1554c] transition-all cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-semibold">Navegação Mobile Premium</span>
              </div>
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
          </div>
          
          <p className="mt-8 text-[#d88a85] font-bold text-center italic">
            "Transforme sua vitrine em um motor de vendas."
          </p>
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-5px] transition-all group">
    <div className="w-14 h-14 bg-[#fef5f4] text-[#c1554c] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#c1554c] group-hover:text-white transition-all">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
    <p className="text-slate-600 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

const Features = () => {
  return (
    <section className="py-24 bg-white" id="beneficios">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-[#c1554c] font-bold uppercase tracking-widest text-xs mb-4 block">Recursos</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6">
            O Showroom Digital que sua coleção infantil merece.
          </h2>
          <p className="text-slate-600">
            Construído especificamente para a dinâmica de fabricantes e lojistas de moda e enxoval.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Layers}
            title="Gestão Multi-tenant"
            description="Um só ecossistema para organizar catálogos de múltiplos fabricantes, com acesso dedicado para reps globais e lojistas."
          />
          <FeatureCard 
            icon={MousePointer2}
            title="Links Rastreáveis"
            description="Saiba exatamente quem abriu o link, quanto tempo passou navegando e quais produtos despertaram interesse real."
          />
          <FeatureCard 
            icon={Smartphone}
            title="Mobile-First Nativo"
            description="O lojista navega no celular com a mesma facilidade de um e-commerce premium, sem precisar instalar nada."
          />
          <FeatureCard 
            icon={Printer}
            title="Fim dos Custos de Impressão"
            description="Atualize fotos, preços e grade em minutos e economize milhares de reais em reimpressões desnecessárias."
          />
          <FeatureCard 
            icon={Users}
            title="Controle de Representantes"
            description="Identifique quais representantes estão ativos, quais rotas estão performando e quem ainda usa material antigo."
          />
          <FeatureCard 
            icon={Layout}
            title="Personalização Visual"
            description="Layouts pensados para encantar: fundos, logos e storytelling de coleção alinhados com a estética infantil premium."
          />
        </div>
      </div>
    </section>
  );
};

const PersonaBenefits = () => {
  const [activePersona, setActivePersona] = useState(0);

  const personas = [
    {
      title: "Para Fabricantes",
      icon: <Layers size={20} />,
      points: [
        "Atualização instantânea de mix e preços",
        "Visibilidade total sobre a performance dos reps",
        "Redução de retrabalho com notas de crédito e erros",
        "Percepção de marca profissional e moderna"
      ],
      color: "bg-[#c1554c]"
    },
    {
      title: "Para Representantes",
      icon: <Users size={20} />,
      points: [
        "Catálogo leve que abre instantaneamente no 4G",
        "Links personalizados para saber quem abriu",
        "Filtros por faixa etária, gênero e ticket médio",
        "Apresentação mais fluida e consultiva"
      ],
      color: "bg-teal-600"
    },
    {
      title: "Para Lojistas",
      icon: <Smartphone size={20} />,
      points: [
        "Navegação rápida sem baixar arquivos pesados",
        "Informações claras de grade, preço e estoque",
        "Segurança de estar vendo a coleção atualizada",
        "Experiência de compra próxima de um showroom físico"
      ],
      color: "bg-blue-600"
    }
  ];

  return (
    <section className="py-24 bg-slate-50" id="personas">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-1/3">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Benefícios para todos os elos da venda.</h2>
            <div className="space-y-4">
              {personas.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePersona(i)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-left ${
                    activePersona === i 
                    ? `${p.color} text-white shadow-lg` 
                    : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className={`p-2 rounded-lg ${activePersona === i ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                    {p.icon}
                  </span>
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="md:w-2/3">
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-100 min-h-[400px] flex flex-col justify-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-8 ${personas[activePersona].color}`}>
                {personas[activePersona].icon}
              </div>
              <h3 className="text-3xl font-bold text-slate-900 mb-10">{personas[activePersona].title}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {personas[activePersona].points.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                    <span className="text-slate-700 font-medium text-lg">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Comparison = () => {
  const tableData = [
    { feature: "Atualização de Preços", pdf: "Gerar novo arquivo e reenviar", zouth: "Instantânea para todos os links" },
    { feature: "Rastreio de Acessos", pdf: "Inexistente", zouth: "Painel em tempo real por Rep/Cliente" },
    { feature: "Navegação Mobile", pdf: "Zoom cansativo e rolagem infinita", zouth: "Nativo, fluido e intuitivo" },
    { feature: "Controle de Versão", pdf: "Caótico (várias versões circulando)", zouth: "Fonte única da verdade" },
    { feature: "Custo por Coleção", pdf: "Impressão + Horas de Design", zouth: "Assinatura SaaS fixa e previsível" },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-16">PDF Tradicional vs. Zouth Suíte</h2>
        <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-6 font-bold text-slate-500 uppercase text-xs">Funcionalidade</th>
                <th className="p-6 font-bold text-slate-900">Catálogo em PDF</th>
                <th className="p-6 font-bold text-[#c1554c] bg-[#fef5f4]/50">Zouth Suíte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6 text-sm font-bold text-slate-700">{row.feature}</td>
                  <td className="p-6 text-sm text-slate-500">{row.pdf}</td>
                  <td className="p-6 text-sm font-semibold text-slate-900 bg-[#fef5f4]/20">{row.zouth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 py-6 last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left font-bold text-lg text-slate-800 hover:text-[#c1554c] transition-colors"
      >
        {question}
        {isOpen ? <Minus size={20} className="text-[#c1554c]" /> : <Plus size={20} className="text-slate-400" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-slate-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  return (
    <section className="py-24 bg-slate-50" id="faq">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">Dúvidas Frequentes</h2>
          <p className="text-slate-500 mt-4">Tudo o que você precisa saber sobre o Zouth Suíte.</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <FAQItem 
            question="Meus lojistas precisam instalar algum aplicativo?" 
            answer="Não! O catálogo é acessado diretamente pelo navegador via link. É tão simples quanto abrir um site, mas com a experiência de um app premium."
          />
          <FAQItem 
            question="Como funciona o rastreamento?" 
            answer="Cada link gerado pode ter parâmetros exclusivos por representante ou cliente. No seu painel, você vê métricas de abertura, tempo de permanência e cliques em tempo real."
          />
          <FAQItem 
            question="É difícil cadastrar os produtos?" 
            answer="O fluxo foi desenhado para ser intuitivo. Você pode importar dados, criar coleções rapidamente e nosso suporte acompanha você no passo a passo inicial."
          />
          <FAQItem 
            question="Já tenho um e-commerce B2B, o Zouth substitui ele?" 
            answer="O Zouth funciona como um showroom premium focado em desejo e apresentação de coleção. Ele complementa seu B2B, servindo como a 'vitrine de entrada' que encanta o lojista antes do fechamento."
          />
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-slate-900 rounded-[50px] p-12 md:p-24 text-center relative overflow-hidden">
          {/* Circulos decorativos */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#c1554c]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#c1554c]/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Pronto para transformar sua vitrine digital?
            </h2>
            <p className="text-[#fce8e6] text-lg mb-12">
              Dê adeus ao caos dos PDFs e comece a vender com um catálogo que acompanha o ritmo da sua coleção.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#c1554c] hover:bg-[#a84741] text-white px-10 py-5 rounded-full font-bold text-xl shadow-xl transition-all hover:scale-105">
                Começar Teste Grátis
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-10 py-5 rounded-full font-bold text-xl transition-all">
                Falar com Consultor
              </button>
            </div>
            <p className="mt-8 text-slate-400 text-sm font-medium">
              Agende uma demonstração de 15 minutos e veja na prática.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-white pt-20 pb-10 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-20">
        <div className="col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-[#c1554c] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Z</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Zouth <span className="text-[#c1554c]">Suíte</span></span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            A solução definitiva para catálogos digitais no atacado infantil. Modernidade, controle e performance para sua marca.
          </p>
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#fce8e6] hover:text-[#c1554c] transition-all cursor-pointer">
              <MessageSquare size={16} />
            </div>
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#fce8e6] hover:text-[#c1554c] transition-all cursor-pointer">
              <Users size={16} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-6">Produto</h4>
          <ul className="space-y-4 text-sm text-slate-500 font-medium">
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Funcionalidades</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Showroom Digital</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Links Rastreáveis</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Planos</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-6">Para Quem</h4>
          <ul className="space-y-4 text-sm text-slate-500 font-medium">
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Fabricantes</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Representantes</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Lojistas Multimarcas</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Distribuidores</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-6">Empresa</h4>
          <ul className="space-y-4 text-sm text-slate-500 font-medium">
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Sobre Nós</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Blog de Atacado</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">Suporte</li>
            <li className="hover:text-[#c1554c] cursor-pointer transition-colors">LGPD</li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-400 text-xs font-medium">
          © 2026 Zouth. Todos os direitos reservados.
        </p>
        <div className="flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span className="hover:text-slate-600 cursor-pointer">Termos</span>
          <span className="hover:text-slate-600 cursor-pointer">Privacidade</span>
        </div>
      </div>
    </footer>
  );
};

export default function App({ canRegister = true }: { canRegister?: boolean }) {
  const { auth } = usePage<SharedData>().props;

  return (
    <>
      <Head title="Zouth Suíte - Catálogo Digital para Atacado Infantil" />
      <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#fce8e6] selection:text-[#c1554c]">
        <Navbar auth={auth} canRegister={canRegister} />
        <Hero />
        <Logos />
        <Problem />
        <Features />
        <PersonaBenefits />
        <Comparison />
        <FAQ />
        <CTASection />
        <Footer />
      </div>
    </>
  );
}