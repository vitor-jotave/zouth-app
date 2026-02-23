<x-mail::message>
# Bem-vindo ao {{ config('app.name') }}, {{ $ownerName }}!

O fabricante **{{ $manufacturer->name }}** foi cadastrado com sucesso na plataforma.

Para começar a usar todos os recursos, escolha o plano que melhor se encaixa na sua operação clicando no botão abaixo.

<x-mail::button :url="$planSelectionUrl">
Selecionar Plano
</x-mail::button>

Este link é válido por **3 dias**. Após esse prazo, entre em contato com o suporte para obter um novo link de acesso.

Obrigado,<br>
{{ config('app.name') }}
</x-mail::message>
