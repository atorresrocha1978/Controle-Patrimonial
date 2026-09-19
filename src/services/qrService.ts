import QRCode from 'qrcode';

export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Erro ao gerar QR Code:', err);
    return '';
  }
}

export function formatAssetPayloadForQr(asset: { code: string; name: string; room: string }): string {
  return JSON.stringify({
    patrimonio: asset.code,
    descricao: asset.name,
    local: asset.room,
    appUrl: window.location.origin
  });
}
