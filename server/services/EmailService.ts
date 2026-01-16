import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Ініціалізація SMTP транспортера
   */
  static initialize(): void {
    if (this.transporter) {
      return;
    }

    // Перевірка наявності обов'язкових змінних оточення
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  SMTP не настроен! Переменные SMTP_USER и SMTP_PASS не установлены.');
      console.warn('⚠️  Email не будет отправляться. Для разработки код подтверждения будет выводиться в консоль.');
      return;
    }

    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true для 465, false для інших портів
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    console.log('✅ SMTP transporter инициализирован');
  }

  /**
   * Відправка email
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.initialize();
    }

    if (!this.transporter) {
      // Для розробки: виводимо інформацію про email в консоль
      console.log('\n========================================');
      console.log('📧 EMAIL НЕ ОТПРАВЛЕН (SMTP не настроен)');
      console.log('========================================');
      console.log('Кому:', options.to);
      console.log('Тема:', options.subject);
      console.log('Текст:', options.text || this.stripHtml(options.html));
      console.log('========================================\n');
      
      // Витягуємо код з HTML для зручності
      const codeMatch = options.html.match(/<div class="code">(\d{6})<\/div>/);
      if (codeMatch) {
        console.log(`\n🔐 КОД ПОДТВЕРЖДЕНИЯ: ${codeMatch[1]}\n`);
      }
      
      // Викидаємо помилку, щоб route міг обробити її і повернути код
      const error = new Error('SMTP_NOT_CONFIGURED');
      (error as any).code = codeMatch ? codeMatch[1] : null;
      throw error;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'SST Site <noreply@sst-site.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });
      console.log(`✅ Email отправлен на ${options.to}`);
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error);
      throw error;
    }
  }

  /**
   * Шаблон підтвердження реєстрації
   */
  static async sendVerificationEmail(email: string, firstName: string, code: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; 
                  background-color: #fff; padding: 20px; margin: 20px 0; border: 2px dashed #333; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SST Site</h1>
          </div>
          <div class="content">
            <h2>Здравствуйте, ${firstName}!</h2>
            <p>Вы зарегистрировались на платформе SST Site.</p>
            <p>Ваш код подтверждения:</p>
            <div class="code">${code}</div>
            <p>Код действителен 15 минут.</p>
            <p>Если это были не вы, проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>© 2026 SST Site</p>
            <p>Это автоматическое письмо, не отвечайте на него.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Подтверждение регистрации на SST Site',
      html,
    });
  }

  /**
   * Шаблон відновлення пароля
   */
  static async sendPasswordResetEmail(email: string, firstName: string, code: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; 
                  background-color: #fff; padding: 20px; margin: 20px 0; border: 2px dashed #333; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SST Site</h1>
          </div>
          <div class="content">
            <h2>Здравствуйте, ${firstName}!</h2>
            <p>Вы запросили восстановление пароля.</p>
            <p>Ваш код:</p>
            <div class="code">${code}</div>
            <p>Код действителен 15 минут.</p>
            <div class="warning">
              <strong>⚠️ Внимание!</strong> Если это были не вы, немедленно свяжитесь с поддержкой.
            </div>
          </div>
          <div class="footer">
            <p>© 2026 SST Site</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Восстановление пароля на SST Site',
      html,
    });
  }

  /**
   * Шаблон сповіщення про відхилення заявки на роль
   */
  static async sendRoleRequestRejectedEmail(
    email: string,
    firstName: string,
    roleName: string,
    message?: string | null
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .rejection { background-color: #fff3cd; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
          .message { background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SST Site</h1>
          </div>
          <div class="content">
            <h2>Здравствуйте, ${firstName}!</h2>
            <p>К сожалению, ваша заявка на роль <strong>${roleName}</strong> была отклонена администратором.</p>
            ${message ? `
            <div class="message">
              <strong>Комментарий администратора:</strong>
              <p>${message}</p>
            </div>
            ` : ''}
            <div class="rejection">
              <p>Если у вас есть вопросы, пожалуйста, свяжитесь с администратором системы.</p>
            </div>
            <p>Вы можете подать новую заявку через личный кабинет.</p>
          </div>
          <div class="footer">
            <p>© 2026 SST Site</p>
            <p>Это автоматическое письмо, не отвечайте на него.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail({
        to: email,
        subject: `Заявка на роль ${roleName} отклонена - SST Site`,
        html,
      });
    } catch (error) {
      console.error('Ошибка отправки email об отклонении заявки:', error);
      // Не викидаємо помилку, щоб не зламати процес відхилення
    }
  }

  /**
   * Шаблон сповіщення про схвалення заявки на роль
   */
  static async sendRoleAssignedEmail(
    email: string,
    firstName: string,
    roleName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .success { background-color: #d4edda; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SST Site</h1>
          </div>
          <div class="content">
            <h2>Здравствуйте, ${firstName}!</h2>
            <p>Поздравляем! Ваша заявка на роль <strong>${roleName}</strong> была одобрена администратором.</p>
            <div class="success">
              <p><strong>✅ Вам назначена роль ${roleName}</strong></p>
              <p>Теперь у вас есть доступ к дополнительным функциям системы.</p>
            </div>
            <p>Войдите в систему, чтобы начать работу с новыми возможностями.</p>
          </div>
          <div class="footer">
            <p>© 2026 SST Site</p>
            <p>Это автоматическое письмо, не отвечайте на него.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail({
        to: email,
        subject: `Роль ${roleName} назначена - SST Site`,
        html,
      });
    } catch (error) {
      console.error('Ошибка отправки email о назначении роли:', error);
      // Не викидаємо помилку, щоб не зламати процес схвалення
    }
  }

  /**
   * Шаблон сповіщення про додавання ролі адміністратором
   */
  static async sendRoleAddedEmail(
    email: string,
    firstName: string,
    roleName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .success { background-color: #d4edda; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SST Site</h1>
          </div>
          <div class="content">
            <h2>Здравствуйте, ${firstName}!</h2>
            <p>Администратор системы назначил вам роль <strong>${roleName}</strong>.</p>
            <div class="success">
              <p><strong>✅ Вам назначена роль ${roleName}</strong></p>
              <p>Теперь у вас есть доступ к дополнительным функциям системы.</p>
            </div>
            <p>Войдите в систему, чтобы начать работу с новыми возможностями.</p>
          </div>
          <div class="footer">
            <p>© 2026 SST Site</p>
            <p>Это автоматическое письмо, не отвечайте на него.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail({
        to: email,
        subject: `Роль ${roleName} назначена - SST Site`,
        html,
      });
    } catch (error) {
      console.error('Ошибка отправки email о назначении роли:', error);
      // Не викидаємо помилку, щоб не зламати процес призначення ролі
    }
  }

  /**
   * Шаблон сповіщення про видалення ролі адміністратором
   */
  static async sendRoleRemovedEmail(
    email: string,
    firstName: string,
    roleName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SST Site</h1>
          </div>
          <div class="content">
            <h2>Здравствуйте, ${firstName}!</h2>
            <p>Администратор системы удалил у вас роль <strong>${roleName}</strong>.</p>
            <div class="warning">
              <p><strong>⚠️ Роль ${roleName} удалена</strong></p>
              <p>Доступ к функциям, связанным с этой ролью, был ограничен.</p>
            </div>
            <p>Если у вас есть вопросы, пожалуйста, свяжитесь с администратором системы.</p>
          </div>
          <div class="footer">
            <p>© 2026 SST Site</p>
            <p>Это автоматическое письмо, не отвечайте на него.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.sendEmail({
        to: email,
        subject: `Роль ${roleName} удалена - SST Site`,
        html,
      });
    } catch (error) {
      console.error('Ошибка отправки email об удалении роли:', error);
      // Не викидаємо помилку, щоб не зламати процес видалення ролі
    }
  }

  /**
   * Видалення HTML тегів для текстової версії
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}
