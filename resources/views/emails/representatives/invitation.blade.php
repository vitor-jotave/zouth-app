<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $invitation->manufacturer->name }} convidou você</title>
</head>
<body style="margin:0;background:#e7e3dc;color:#18181f;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#e7e3dc;">
    <tr>
        <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#f6f4f0;border:1px solid #cac4ba;">
                <tr>
                    <td style="padding:28px 38px;border-bottom:1px solid #cac4ba;">
                        <img src="{{ $message->embed(public_path('brand/zouth/assets/logo-duotone-dark.png')) }}" width="116" alt="Zouth" style="display:block;width:116px;height:auto;border:0;">
                    </td>
                </tr>
                <tr>
                    <td style="padding:48px 38px 20px;">
                        <p style="margin:0 0 18px;color:#ff4d3d;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;">Convite de Representação</p>
                        <h1 style="margin:0;max-width:520px;color:#18181f;font-size:42px;line-height:1.02;font-weight:600;letter-spacing:-1.8px;">{{ $invitation->manufacturer->name }} quer você como representante<span style="color:#ff4d3d;">.</span></h1>
                        <p style="margin:24px 0 0;color:#5f5d57;font-size:17px;line-height:1.65;">Olá, {{ $invitation->name }}. {{ $invitation->invitedBy->name }} acredita que seu olhar comercial combina com a marca e convidou você para ser um representante.</p>
                    </td>
                </tr>
                @if ($invitation->personal_message)
                    <tr>
                        <td style="padding:8px 38px 24px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-left:3px solid #ff4d3d;">
                                <tr>
                                    <td style="padding:22px 24px;">
                                        <p style="margin:0 0 8px;color:#8c8880;font-size:11px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;">Mensagem do convite</p>
                                        <p style="margin:0;color:#18181f;font-size:16px;line-height:1.6;">{{ $invitation->personal_message }}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                @endif
                <tr>
                    <td style="padding:8px 38px 28px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td width="33.33%" valign="top" style="padding:16px 16px 16px 0;border-top:1px solid #cac4ba;">
                                    <p style="margin:0 0 7px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Apresente</p>
                                    <p style="margin:0;color:#18181f;font-size:14px;line-height:1.5;">Compartilhe o catálogo com seus lojistas.</p>
                                </td>
                                <td width="33.33%" valign="top" style="padding:16px;border-top:1px solid #cac4ba;">
                                    <p style="margin:0 0 7px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Acompanhe</p>
                                    <p style="margin:0;color:#18181f;font-size:14px;line-height:1.5;">Veja os pedidos atribuídos à sua rede.</p>
                                </td>
                                <td width="33.33%" valign="top" style="padding:16px 0 16px 16px;border-top:1px solid #cac4ba;">
                                    <p style="margin:0 0 7px;color:#8c8880;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Movimente</p>
                                    <p style="margin:0;color:#18181f;font-size:14px;line-height:1.5;">Leve a coleção para novas vitrines.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:0 38px 48px;">
                        <a href="{{ $acceptUrl }}" style="display:inline-block;background:#18181f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 26px;border:1px solid #18181f;">Aceitar convite &nbsp;→</a>
                        <p style="margin:20px 0 0;color:#8c8880;font-size:12px;line-height:1.6;">O convite é pessoal, pode ser usado uma vez e fica disponível por 7 dias.</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:26px 38px;background:#18181f;color:#f6f4f0;">
                        <p style="margin:0 0 9px;font-size:12px;line-height:1.5;">Se o botão não abrir, copie este endereço:</p>
                        <p style="margin:0;word-break:break-all;font-size:11px;line-height:1.55;color:#cac4ba;">{{ $acceptUrl }}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
