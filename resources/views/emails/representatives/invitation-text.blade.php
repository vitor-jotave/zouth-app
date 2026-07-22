{{ $invitation->manufacturer->name }} quer você na rede.

Olá, {{ $invitation->name }}.

{{ $invitation->invitedBy->name }} convidou você para representar a coleção de {{ $invitation->manufacturer->name }} pela Zouth.

@if ($invitation->personal_message)
Mensagem do convite:
{{ $invitation->personal_message }}

@endif
Ao aceitar, você poderá compartilhar o catálogo, acompanhar pedidos atribuídos e movimentar a coleção em novas vitrines.

Aceite o convite: {{ $acceptUrl }}

O convite é pessoal, pode ser usado uma vez e fica disponível por 7 dias.
