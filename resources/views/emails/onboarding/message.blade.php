<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
</head>
<body style="margin:0;background:#e7e3dc;color:#18181f;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e7e3dc;padding:32px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#f6f4f0;border:1px solid #cac4ba;">
                <tr>
                    <td style="padding:32px 40px;border-bottom:1px solid #cac4ba;">
                        @php($logoPath = public_path('brand/zouth/assets/logo-duotone-dark.png'))
                        <img src="{{ isset($message) && file_exists($logoPath) ? $message->embed($logoPath) : asset('/brand/zouth/assets/logo-duotone-dark.png') }}" width="164" alt="Zouth" style="display:block;width:164px;height:auto;border:0;">
                    </td>
                </tr>
                <tr>
                    <td style="padding:48px 40px 24px;">
                        <p style="margin:0 0 20px;color:#ff4d3d;font-size:12px;font-weight:700;letter-spacing:2.4px;line-height:1.4;">{{ $eyebrow }}</p>
                        <h1 style="margin:0;max-width:500px;font-size:42px;font-weight:700;letter-spacing:-1.8px;line-height:1.04;">{{ $title }}<span style="color:#ff4d3d;">.</span></h1>
                        <p style="margin:28px 0 0;max-width:520px;color:#5f5d57;font-size:17px;line-height:1.7;">{{ $intro }}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 40px 48px;">
                        <a href="{{ $actionUrl }}" style="display:inline-block;background:#ff4d3d;color:#18181f;padding:17px 24px;font-size:15px;font-weight:700;text-decoration:none;border:1px solid #ff4d3d;">{{ $actionLabel }} &nbsp;↗</a>
                        <p style="margin:28px 0 0;padding-top:24px;border-top:1px solid #cac4ba;color:#77746d;font-size:13px;line-height:1.6;">{{ $note }}</p>
                        <p style="margin:16px 0 0;color:#77746d;font-size:12px;line-height:1.6;word-break:break-all;">{{ $actionUrl }}</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:24px 40px;background:#18181f;color:#f6f4f0;font-size:12px;line-height:1.6;">Zouth. Sua coleção em movimento.</td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
