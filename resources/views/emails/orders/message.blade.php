<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
</head>
<body style="margin:0;background:#e7e3dc;color:#18181f;font-family:Arial,Helvetica,sans-serif;">
@php($logoPath = public_path('brand/zouth/assets/logo-duotone-dark.png'))
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e7e3dc;padding:32px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#f6f4f0;border:1px solid #cac4ba;">
                <tr>
                    <td style="padding:30px 40px;border-bottom:1px solid #cac4ba;">
                        <img src="{{ isset($message) && file_exists($logoPath) ? $message->embed($logoPath) : asset('/brand/zouth/assets/logo-duotone-dark.png') }}" width="148" alt="Zouth" style="display:block;width:148px;height:auto;border:0;">
                    </td>
                </tr>
                <tr>
                    <td style="padding:44px 40px 26px;">
                        <p style="margin:0 0 18px;color:#ff4d3d;font-size:12px;font-weight:700;letter-spacing:2.3px;line-height:1.4;">{{ $eyebrow }}</p>
                        <h1 style="margin:0;max-width:560px;font-size:40px;font-weight:700;letter-spacing:-1.7px;line-height:1.04;">{{ $title }}<span style="color:#ff4d3d;">.</span></h1>
                        <p style="margin:24px 0 0;max-width:560px;color:#5f5d57;font-size:17px;line-height:1.7;">{{ $intro }}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:6px 40px 32px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #cac4ba;border-bottom:1px solid #cac4ba;">
                            <tr>
                                <td style="padding:18px 0;">
                                    <p style="margin:0 0 5px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">{{ $orderType }}</p>
                                    <p style="margin:0;color:#18181f;font-size:18px;font-weight:700;">{{ $orderNumber }}</p>
                                </td>
                                <td align="center" style="padding:18px 12px;">
                                    <p style="margin:0 0 5px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Andamento</p>
                                    <p style="margin:0;color:#18181f;font-size:15px;font-weight:700;">{{ $statusLabel }}</p>
                                </td>
                                <td align="right" style="padding:18px 0;">
                                    <p style="margin:0 0 5px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Peças</p>
                                    <p style="margin:0;color:#18181f;font-size:18px;font-weight:700;">{{ $totalItems }}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 40px 32px;">
                        <p style="margin:0 0 12px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Seleção de {{ $customerName }}</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            @foreach ($items as $item)
                                <tr>
                                    <td valign="top" style="padding:14px 0;border-top:1px solid #ded9d1;">
                                        <p style="margin:0;color:#18181f;font-size:15px;font-weight:700;line-height:1.45;">{{ $item['name'] }}</p>
                                        <p style="margin:5px 0 0;color:#77746d;font-size:12px;line-height:1.5;">
                                            {{ $item['sku'] ?: 'Sem SKU' }}
                                            @if ($item['variations'])
                                                &nbsp;·&nbsp; {{ $item['variations'] }}
                                            @endif
                                        </p>
                                    </td>
                                    <td align="center" valign="top" style="padding:14px 12px;border-top:1px solid #ded9d1;color:#18181f;font-size:14px;font-weight:700;white-space:nowrap;">{{ $item['quantity'] }} un.</td>
                                    <td align="right" valign="top" style="padding:14px 0;border-top:1px solid #ded9d1;color:#18181f;font-size:14px;font-weight:700;white-space:nowrap;">{{ $item['lineTotal'] ?? 'Sob consulta' }}</td>
                                </tr>
                            @endforeach
                        </table>
                        @if ($showAmount)
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;background:#18181f;color:#f6f4f0;">
                                <tr>
                                    <td style="padding:18px 20px;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">{{ $amountLabel }}</td>
                                    <td align="right" style="padding:18px 20px;font-size:22px;font-weight:700;">{{ $amount }}</td>
                                </tr>
                            </table>
                        @endif
                    </td>
                </tr>
                <tr>
                    <td style="padding:4px 40px 46px;">
                        <a href="{{ $actionUrl }}" style="display:inline-block;background:#ff4d3d;color:#18181f;padding:17px 24px;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #ff4d3d;">{{ $actionLabel }} &nbsp;↗</a>
                        <p style="margin:26px 0 0;padding-top:22px;border-top:1px solid #cac4ba;color:#77746d;font-size:13px;line-height:1.6;">{{ $note }}</p>
                        <p style="margin:14px 0 0;color:#77746d;font-size:11px;line-height:1.6;word-break:break-all;">{{ $actionUrl }}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:23px 40px;background:#18181f;color:#f6f4f0;font-size:12px;line-height:1.6;">Zouth. Sua coleção em movimento.</td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
