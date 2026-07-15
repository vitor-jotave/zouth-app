<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class LegalController extends Controller
{
    public function terms(): Response
    {
        return $this->renderDocument(
            'Termos de Uso',
            'Estes termos regulam o acesso ao Zouth App por fabricantes, representantes, atendentes e demais usuários autorizados.',
            [
                ['title' => '1. Serviço', 'paragraphs' => [
                    'O Zouth App oferece recursos de catálogo digital, produtos, pedidos, clientes, representantes, assinaturas e atendimento por WhatsApp, conforme o plano contratado e as integrações configuradas.',
                    'Funcionalidades podem depender de serviços de terceiros, como Stripe, provedores de e-mail, armazenamento de arquivos e Evolution API.',
                ]],
                ['title' => '2. Conta e acesso', 'paragraphs' => [
                    'O usuário deve fornecer dados corretos, manter suas credenciais em sigilo e comunicar imediatamente qualquer uso não autorizado. Cada perfil deve utilizar apenas os fabricantes e recursos para os quais recebeu permissão.',
                    'Contas de fabricante são provisionadas pelo fluxo comercial e administrativo. O cadastro público é destinado a representantes comerciais.',
                ]],
                ['title' => '3. Assinaturas e cobrança', 'paragraphs' => [
                    'Planos pagos são processados pelo Stripe. O acesso é liberado após a confirmação da assinatura e pode ser limitado, suspenso ou encerrado conforme o status do pagamento e as condições do plano.',
                    'Cancelamentos seguem o período de vigência informado no painel de cobrança. Alterações de preço ou plano serão comunicadas pelos canais cadastrados quando aplicável.',
                ]],
                ['title' => '4. Uso aceitável', 'paragraphs' => [
                    'É proibido usar o serviço para conteúdo ilícito, fraude, violação de propriedade intelectual, envio abusivo de mensagens, tentativa de acesso indevido ou atividade que comprometa a segurança e disponibilidade da plataforma.',
                    'O fabricante é responsável pela legitimidade dos produtos, imagens, preços, contatos e mensagens que cadastrar ou enviar.',
                ]],
                ['title' => '5. Conteúdo e propriedade intelectual', 'paragraphs' => [
                    'O cliente mantém a titularidade do conteúdo que envia e concede ao Zouth App a autorização necessária para armazená-lo, processá-lo e exibi-lo durante a prestação do serviço.',
                    'Software, marca, interfaces e materiais próprios do Zouth App permanecem protegidos pela legislação aplicável.',
                ]],
                ['title' => '6. Disponibilidade e responsabilidade', 'paragraphs' => [
                    'Empregamos medidas razoáveis de segurança e continuidade, mas integrações externas, internet e manutenções podem causar indisponibilidade temporária. Incidentes relevantes serão tratados conforme a legislação e os canais operacionais disponíveis.',
                    'O sistema apoia a operação comercial, mas não substitui validações fiscais, contábeis, jurídicas ou logísticas do fabricante.',
                ]],
                ['title' => '7. Encerramento e alterações', 'paragraphs' => [
                    'O acesso pode ser suspenso em caso de inadimplência, abuso, risco de segurança ou violação destes termos. Mudanças relevantes serão publicadas nesta página com nova data de vigência.',
                ]],
            ],
        );
    }

    public function privacy(): Response
    {
        return $this->renderDocument(
            'Política de Privacidade',
            'Esta política explica como dados pessoais são tratados no Zouth App e nas operações realizadas pelos fabricantes que utilizam a plataforma.',
            [
                ['title' => '1. Dados tratados', 'paragraphs' => [
                    'Podemos tratar identificação e contato de usuários, fabricantes, representantes e clientes de pedidos, incluindo nome, e-mail, telefone, CPF ou CNPJ e endereço.',
                    'Também tratamos dados de conta, registros de acesso, informações de catálogo, pedidos, conversas de atendimento, arquivos enviados e dados técnicos necessários à segurança e operação.',
                ]],
                ['title' => '2. Finalidades e bases legais', 'paragraphs' => [
                    'Os dados são usados para fornecer o serviço, autenticar usuários, processar pedidos e assinaturas, habilitar atendimento, prevenir fraude, cumprir obrigações legais e prestar suporte.',
                    'O tratamento pode se apoiar na execução de contrato, cumprimento de obrigação legal, legítimo interesse, exercício regular de direitos ou consentimento, conforme o contexto.',
                ]],
                ['title' => '3. Papéis no tratamento', 'paragraphs' => [
                    'O fabricante normalmente decide como utilizar dados de seus clientes e atua como controlador dessa operação. O Zouth App atua como operador ao processar esses dados segundo as instruções e configurações do fabricante.',
                    'Para dados de conta, segurança, cobrança e relação contratual própria, o Zouth App pode atuar como controlador.',
                ]],
                ['title' => '4. Compartilhamento', 'paragraphs' => [
                    'Dados podem ser processados por fornecedores necessários à operação, como hospedagem, banco de dados, armazenamento, e-mail, Stripe e integração de WhatsApp. O compartilhamento é limitado à finalidade do serviço e às obrigações legais.',
                    'Não comercializamos dados pessoais de clientes ou usuários.',
                ]],
                ['title' => '5. Retenção e segurança', 'paragraphs' => [
                    'Os dados são mantidos pelo tempo necessário à prestação do serviço, ao cumprimento de obrigações legais e à defesa de direitos. Após esse período, podem ser eliminados ou anonimizados.',
                    'Aplicamos controles de acesso, segregação por fabricante, registros técnicos e medidas de proteção compatíveis com o risco, sem prometer segurança absoluta.',
                ]],
                ['title' => '6. Direitos do titular', 'paragraphs' => [
                    'O titular pode solicitar confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamentos e revisão de consentimento, observados os limites legais.',
                    'Pedidos relacionados a uma compra devem ser dirigidos inicialmente ao fabricante responsável pelo catálogo. Solicitações sobre o Zouth App podem ser enviadas ao contato indicado abaixo.',
                ]],
            ],
        );
    }

    public function lgpd(): Response
    {
        return $this->renderDocument(
            'LGPD e Direitos dos Titulares',
            'O Zouth App mantém este canal para orientar titulares e fabricantes sobre a Lei Geral de Proteção de Dados Pessoais.',
            [
                ['title' => 'Como exercer seus direitos', 'paragraphs' => [
                    'Envie uma solicitação informando seu nome, meio de contato, relação com a plataforma e o direito que deseja exercer. Poderemos pedir informações adicionais para confirmar a identidade e evitar acesso indevido.',
                    'Responderemos em prazo compatível com a LGPD e informaremos quando a solicitação depender do fabricante que controla os dados do pedido ou atendimento.',
                ]],
                ['title' => 'Responsabilidades do fabricante', 'paragraphs' => [
                    'Cada fabricante deve definir finalidade e base legal para seus cadastros, pedidos e comunicações, manter avisos próprios quando necessário e atender solicitações de seus clientes.',
                    'O fabricante não deve inserir dados excessivos nem usar o atendimento para mensagens sem base legal ou em desacordo com as regras do WhatsApp.',
                ]],
                ['title' => 'Incidentes de segurança', 'paragraphs' => [
                    'Suspeitas de exposição, perda ou acesso indevido devem ser comunicadas imediatamente. O Zouth App avaliará impacto, contenção e notificações aplicáveis em conjunto com os controladores envolvidos.',
                ]],
                ['title' => 'Contato de privacidade', 'paragraphs' => [
                    'Use o e-mail abaixo para dúvidas ou solicitações relacionadas a dados pessoais. Esse canal não substitui o suporte comercial ou operacional.',
                ]],
            ],
        );
    }

    /**
     * @param  list<array{title: string, paragraphs: list<string>}>  $sections
     */
    private function renderDocument(string $title, string $introduction, array $sections): Response
    {
        return Inertia::render('legal/show', [
            'document' => [
                'title' => $title,
                'introduction' => $introduction,
                'effectiveDate' => '15 de julho de 2026',
                'sections' => $sections,
            ],
            'privacyEmail' => config('commercial.privacy_email'),
        ]);
    }
}
