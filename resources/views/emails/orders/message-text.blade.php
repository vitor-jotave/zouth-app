{{ $title }}

{{ $intro }}

{{ $orderType }} {{ $orderNumber }}
Andamento: {{ $statusLabel }}
Cliente: {{ $customerName }}
Peças: {{ $totalItems }}

@foreach ($items as $item)
- {{ $item['quantity'] }}x {{ $item['name'] }}{{ $item['sku'] ? ' ('.$item['sku'].')' : '' }}{{ $item['variations'] ? ' — '.$item['variations'] : '' }}{{ $item['lineTotal'] ? ' — '.$item['lineTotal'] : '' }}
@endforeach

@if ($showAmount)
{{ $amountLabel }}: {{ $amount }}

@endif
{{ $actionLabel }}: {{ $actionUrl }}

{{ $note }}

Zouth. Sua coleção em movimento.
