import QRCode from 'qrcode';

export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 400,
      margin: 0,
      color: {
        dark: '#000000',
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

export function formatAssetPayloadForQr(asset: { 
  code: string; 
  name: string; 
  room?: string;
  serialNumber?: string;
}): string {
  return JSON.stringify({
    patrimonio: asset.code,
    descricao: asset.name,
    serie: asset.serialNumber || 'N/A',
    local: asset.room || '',
    appUrl: window.location.origin
  });
}
