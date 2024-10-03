import QRCode from 'qrcode';

export async function generateQRCode(billID: string): Promise<string> {
  try {
    const qrCodeURL = await QRCode.toDataURL(billID);
    return qrCodeURL;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}
