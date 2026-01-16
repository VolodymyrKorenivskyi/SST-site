import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class TwoFactorService {
  /**
   * Генерація TOTP секрету
   */
  static generateSecret(email: string, issuer: string = 'SST Site'): {
    secret: string;
    otpauthUrl: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${email})`,
      issuer,
      length: 32,
    });

    return {
      secret: secret.base32 || '',
      otpauthUrl: secret.otpauth_url || '',
    };
  }

  /**
   * Генерація QR-коду для Google Authenticator
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Не удалось сгенерировать QR-код');
    }
  }

  /**
   * Верифікація TOTP коду
   */
  static verifyToken(secret: string, token: string, window: number = 1): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window, // Допускается 1 период до/после (30 секунд)
      });
    } catch (error) {
      console.error('Error verifying TOTP token:', error);
      return false;
    }
  }

  /**
   * Генерація QR-коду з секретом для налаштування 2FA
   */
  static async generate2FASetup(email: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
  }> {
    const { secret, otpauthUrl } = this.generateSecret(email);
    const qrCodeUrl = await this.generateQRCode(otpauthUrl);

    return {
      secret,
      qrCodeUrl,
      otpauthUrl,
    };
  }
}
