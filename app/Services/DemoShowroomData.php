<?php

namespace App\Services;

class DemoShowroomData
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function products(): array
    {
        return [
            ['sku' => 'BRI-001', 'name' => 'Vestido Brisa', 'category' => 'Vestidos', 'price_cents' => 13990, 'image' => 'vestido-azul.jpg', 'colors' => ['Azul Névoa', 'Marfim'], 'sizes' => ['2', '4', '6', '8'], 'description' => 'Vestido em linho lavado, com alças delicadas e movimento leve para os dias de verão.'],
            ['sku' => 'BRI-002', 'name' => 'Vestido Aurora', 'category' => 'Vestidos', 'price_cents' => 14990, 'image' => 'vestido-azul.jpg', 'colors' => ['Manteiga', 'Terracota'], 'sizes' => ['2', '4', '6', '8'], 'description' => 'Modelagem ampla, botões naturais e acabamento que valoriza a vitrine.'],
            ['sku' => 'BRI-003', 'name' => 'Bata Laços', 'category' => 'Blusas e camisas', 'price_cents' => 8990, 'image' => 'irmas-coordenadas.jpg', 'colors' => ['Marfim', 'Azul Névoa'], 'sizes' => ['4', '6', '8', '10'], 'description' => 'Bata de algodão com laços frontais e mangas suaves, pensada para composições coordenadas.'],
            ['sku' => 'BRI-004', 'name' => 'Calça Vento', 'category' => 'Partes de baixo', 'price_cents' => 10990, 'image' => 'conjunto-terracota.jpg', 'colors' => ['Terracota', 'Azul Névoa'], 'sizes' => ['4', '6', '8', '10'], 'description' => 'Calça ampla de linho misto com cintura confortável e caimento elegante.'],
            ['sku' => 'BRI-005', 'name' => 'Camisa Sol', 'category' => 'Blusas e camisas', 'price_cents' => 9990, 'image' => 'conjunto-menino.jpg', 'colors' => ['Manteiga', 'Marfim'], 'sizes' => ['2', '4', '6', '8'], 'description' => 'Camisa de manga curta em linho leve, com toque macio e acabamento natural.'],
            ['sku' => 'BRI-006', 'name' => 'Bermuda Horizonte', 'category' => 'Partes de baixo', 'price_cents' => 8490, 'image' => 'conjunto-menino.jpg', 'colors' => ['Azul Névoa', 'Verde Sálvia'], 'sizes' => ['2', '4', '6', '8'], 'description' => 'Bermuda de alfaiataria leve, prática para coordenar toda a coleção.'],
            ['sku' => 'BRI-007', 'name' => 'Macacão Terra', 'category' => 'Bebê', 'price_cents' => 11990, 'image' => 'macacao-bebe.jpg', 'colors' => ['Terracota', 'Azul Névoa'], 'sizes' => ['P', 'M', 'G'], 'description' => 'Macacão curto em algodão lavado, com abertura lateral e botões de madeira.'],
            ['sku' => 'BRI-008', 'name' => 'Body Canelado Nuvem', 'category' => 'Bebê', 'price_cents' => 5990, 'image' => 'flatlay-essenciais.jpg', 'colors' => ['Marfim', 'Manteiga'], 'sizes' => ['P', 'M', 'G'], 'description' => 'Body canelado de algodão macio, base essencial para os primeiros meses.'],
            ['sku' => 'BRI-009', 'name' => 'Cardigã Céu', 'category' => 'Essenciais', 'price_cents' => 10990, 'image' => 'flatlay-essenciais.jpg', 'colors' => ['Azul Névoa', 'Marfim'], 'sizes' => ['P', 'M', 'G', '2'], 'description' => 'Tricô leve com botões naturais e toque aconchegante.'],
            ['sku' => 'BRI-010', 'name' => 'Short Dourado', 'category' => 'Partes de baixo', 'price_cents' => 7490, 'image' => 'flatlay-essenciais.jpg', 'colors' => ['Manteiga', 'Terracota'], 'sizes' => ['P', 'M', 'G', '2'], 'description' => 'Short leve com cós confortável e acabamento dobrado.'],
            ['sku' => 'BRI-011', 'name' => 'Saia Girassol', 'category' => 'Partes de baixo', 'price_cents' => 9490, 'image' => 'irmas-coordenadas.jpg', 'colors' => ['Manteiga', 'Terracota'], 'sizes' => ['4', '6', '8', '10'], 'description' => 'Saia midi com volume delicado e movimento editorial.'],
            ['sku' => 'BRI-012', 'name' => 'Camisa Nuvem', 'category' => 'Blusas e camisas', 'price_cents' => 10490, 'image' => 'irmas-coordenadas.jpg', 'colors' => ['Azul Névoa', 'Marfim'], 'sizes' => ['4', '6', '8', '10'], 'description' => 'Camisa ampla de algodão leve para sobreposições e conjuntos.'],
            ['sku' => 'BRI-013', 'name' => 'Jardineira Horizonte', 'category' => 'Macacões', 'price_cents' => 13490, 'image' => 'jardineira-azul.jpg', 'colors' => ['Azul Névoa', 'Terracota'], 'sizes' => ['2', '4', '6'], 'description' => 'Jardineira longa de sarja leve, com regulagem e bolsos funcionais.'],
            ['sku' => 'BRI-014', 'name' => 'Camiseta Essencial', 'category' => 'Essenciais', 'price_cents' => 5490, 'image' => 'jardineira-azul.jpg', 'colors' => ['Marfim', 'Manteiga', 'Verde Sálvia'], 'sizes' => ['2', '4', '6', '8'], 'description' => 'Camiseta de algodão premium, macia e versátil para todas as combinações.'],
            ['sku' => 'BRI-015', 'name' => 'Calça Movimento', 'category' => 'Partes de baixo', 'price_cents' => 11490, 'image' => 'conjunto-terracota.jpg', 'colors' => ['Terracota', 'Verde Sálvia'], 'sizes' => ['4', '6', '8', '10'], 'description' => 'Calça pantalona infantil com estrutura leve e cintura elástica.'],
            ['sku' => 'BRI-016', 'name' => 'Blusa Laço Marfim', 'category' => 'Blusas e camisas', 'price_cents' => 8490, 'image' => 'conjunto-terracota.jpg', 'colors' => ['Marfim', 'Manteiga'], 'sizes' => ['4', '6', '8', '10'], 'description' => 'Blusa sem mangas com laços nos ombros e acabamento delicado.'],
            ['sku' => 'BRI-017', 'name' => 'Vestido Manhã', 'category' => 'Vestidos', 'price_cents' => 15990, 'image' => 'cover-brisa.jpg', 'colors' => ['Marfim', 'Azul Névoa'], 'sizes' => ['4', '6', '8'], 'description' => 'Vestido de festa leve, com pregas suaves e construção atemporal.'],
            ['sku' => 'BRI-018', 'name' => 'Conjunto Passeio', 'category' => 'Conjuntos', 'price_cents' => 17490, 'image' => 'conjunto-menino.jpg', 'colors' => ['Manteiga', 'Azul Névoa'], 'sizes' => ['2', '4', '6', '8'], 'description' => 'Camisa e bermuda coordenadas para uma vitrine pronta em poucos minutos.'],
            ['sku' => 'BRI-019', 'name' => 'Manta Brisa', 'category' => 'Essenciais', 'price_cents' => 7990, 'image' => 'flatlay-essenciais.jpg', 'colors' => ['Terracota', 'Marfim'], 'sizes' => ['Único'], 'description' => 'Manta de musseline macia em camada dupla, leve e respirável.'],
            ['sku' => 'BRI-020', 'name' => 'Casaquinho Aconchego', 'category' => 'Essenciais', 'price_cents' => 11990, 'image' => 'flatlay-essenciais.jpg', 'colors' => ['Azul Névoa', 'Manteiga'], 'sizes' => ['P', 'M', 'G', '2'], 'description' => 'Casaquinho de tricô com textura artesanal e acabamento premium.'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function colors(): array
    {
        return [
            'Azul Névoa' => '#AFC7D9',
            'Marfim' => '#F3EDE2',
            'Terracota' => '#B96549',
            'Manteiga' => '#EACF80',
            'Verde Sálvia' => '#91A08D',
        ];
    }

    /**
     * @return array<int, array<string, string>>
     */
    public static function customers(): array
    {
        return [
            ['name' => 'Casa Pitanga', 'email' => 'compras@casapitanga.com.br', 'phone' => '(11) 99102-3481', 'city' => 'São Paulo', 'state' => 'SP'],
            ['name' => 'Petit Jardim', 'email' => 'colecoes@petitjardim.com.br', 'phone' => '(21) 99231-7740', 'city' => 'Rio de Janeiro', 'state' => 'RJ'],
            ['name' => 'Vila Miúda', 'email' => 'oi@vilamiuda.com.br', 'phone' => '(31) 99822-1054', 'city' => 'Belo Horizonte', 'state' => 'MG'],
            ['name' => 'Amora Kids', 'email' => 'compras@amorakids.com.br', 'phone' => '(41) 99603-2280', 'city' => 'Curitiba', 'state' => 'PR'],
            ['name' => 'Pé de Nuvem', 'email' => 'loja@pedenuvem.com.br', 'phone' => '(48) 99172-4408', 'city' => 'Florianópolis', 'state' => 'SC'],
            ['name' => 'Broto Concept', 'email' => 'contato@brotoconcept.com.br', 'phone' => '(51) 99541-3390', 'city' => 'Porto Alegre', 'state' => 'RS'],
            ['name' => 'Tangerina Mini', 'email' => 'pedidos@tangerinamin.com.br', 'phone' => '(85) 99716-9022', 'city' => 'Fortaleza', 'state' => 'CE'],
            ['name' => 'Mundo de Linho', 'email' => 'comercial@mundodelinho.com.br', 'phone' => '(71) 99208-7611', 'city' => 'Salvador', 'state' => 'BA'],
        ];
    }

    /**
     * @return array<int, array{shortcut: string, title: string, body: string}>
     */
    public static function quickReplies(): array
    {
        return [
            ['shortcut' => 'catalogo', 'title' => 'Enviar catálogo', 'body' => 'Claro! Separei nosso catálogo Brisa para você conhecer a coleção completa: {catalogo}'],
            ['shortcut' => 'minimo', 'title' => 'Pedido mínimo', 'body' => 'Nosso pedido mínimo é de R$ 1.500. A partir de R$ 3.500, liberamos uma condição especial.'],
            ['shortcut' => 'prazo', 'title' => 'Prazo de produção', 'body' => 'Nosso prazo atual é de 20 a 25 dias úteis após a confirmação do pedido.'],
            ['shortcut' => 'grade', 'title' => 'Grade de tamanhos', 'body' => 'Trabalhamos do bebê ao 10. Você pode montar a grade livremente conforme o perfil da sua loja.'],
            ['shortcut' => 'frete', 'title' => 'Envio e frete', 'body' => 'Enviamos para todo o Brasil. Calculamos a melhor modalidade assim que você finalizar sua seleção.'],
            ['shortcut' => 'obrigada', 'title' => 'Agradecimento', 'body' => 'Obrigada por conhecer a Brisa! Se quiser, posso ajudar a montar uma seleção com a cara da sua loja.'],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function funnels(): array
    {
        return [
            [
                'name' => 'Primeiro contato',
                'code' => 'PRIMEIRO_CONTATO',
                'steps' => [
                    ['type' => 'text', 'payload' => ['body' => 'Oi! Que bom ter você por aqui. Posso te apresentar a coleção Brisa?']],
                    ['type' => 'wait', 'payload' => ['seconds' => 15]],
                    ['type' => 'text', 'payload' => ['body' => 'Ela foi pensada para lojas que buscam peças coordenadas, leves e com ótimo giro de vitrine.']],
                    ['type' => 'product', 'payload' => ['product_sku' => 'BRI-001', 'include_photo' => true, 'include_price' => true, 'include_description' => true, 'include_sku' => true]],
                ],
            ],
            [
                'name' => 'Retomar interesse',
                'code' => 'RETOMAR_INTERESSE',
                'steps' => [
                    ['type' => 'text', 'payload' => ['body' => 'Oi! Vi que você conheceu a coleção Brisa. Ficou alguma dúvida sobre grade, prazo ou pedido mínimo?']],
                    ['type' => 'wait', 'payload' => ['seconds' => 20]],
                    ['type' => 'product', 'payload' => ['product_sku' => 'BRI-018', 'include_photo' => true, 'include_price' => true, 'include_description' => false, 'include_sku' => true]],
                ],
            ],
            [
                'name' => 'Fechamento da seleção',
                'code' => 'FECHAMENTO',
                'steps' => [
                    ['type' => 'text', 'payload' => ['body' => 'Sua seleção ficou linda. Vou conferir disponibilidade e preparar a condição final para você.']],
                    ['type' => 'wait', 'payload' => ['seconds' => 10]],
                    ['type' => 'text', 'payload' => ['body' => 'Se quiser incluir mais modelos, esta é a hora — posso sugerir os complementos com melhor saída.']],
                ],
            ],
        ];
    }

    /**
     * @return array<int, array{name: string, active: bool, keywords: array<int, string>, funnel_code: string}>
     */
    public static function automations(): array
    {
        return [
            ['name' => 'Interesse em catálogo', 'active' => true, 'keywords' => ['catálogo', 'coleção', 'modelos'], 'funnel_code' => 'PRIMEIRO_CONTATO'],
            ['name' => 'Dúvida sobre valores', 'active' => true, 'keywords' => ['preço', 'valor', 'mínimo'], 'funnel_code' => 'RETOMAR_INTERESSE'],
            ['name' => 'Sinal de fechamento', 'active' => false, 'keywords' => ['fechar', 'pedido', 'seleção'], 'funnel_code' => 'FECHAMENTO'],
        ];
    }
}
