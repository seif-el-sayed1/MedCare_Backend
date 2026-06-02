const generateHTML = ({
    link = process.env.FRONTEND_URL,
    logo = process.env.LOGO_URL,
    backgroundColor = "#F4F6F8",
    primaryColor = "#0F766E",        // Teal - يتناسب مع ستايل التطبيق
    secondaryColor = "#ffffff",
    emailTitle,
    emailSubTitle,
    btnText,
    btnLink,
    belowText,
    belowLink,
    footerNote,
    footerLink
}) => {
    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Email</title>

      <style>
        body {
          margin: 0;
          padding: 0;
          background: ${backgroundColor};
          font-family: 'Arial', 'Tahoma', sans-serif;
        }

        .container {
          width: 100%;
          max-width: 600px;
          margin: 30px auto;
          background: ${secondaryColor};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .header {
          background: ${primaryColor};
          padding: 40px 30px 25px;
          text-align: center;
        }

        .header h1 {
          margin: 0;
          color: white;
          font-size: 28px;
          font-weight: bold;
        }

        .content {
          padding: 35px 30px;
          color: #374151;
          font-size: 16px;
          line-height: 28px;
        }

        .button-wrapper {
          text-align: center;
          padding: 20px 30px 40px;
        }

        .button {
          background: ${primaryColor};
          color: #fff !important;
          padding: 16px 36px;
          font-size: 17px;
          border-radius: 12px;
          text-decoration: none;
          display: inline-block;
          font-weight: bold;
          box-shadow: 0 4px 15px rgba(15, 118, 110, 0.3);
        }

        .button:hover {
          opacity: 0.95;
        }

        .below {
          padding: 0 30px 30px;
          font-size: 15.5px;
          line-height: 26px;
          color: #4B5563;
        }

        .below a {
          color: ${primaryColor};
          font-weight: bold;
          text-decoration: none;
        }

        .thank-you {
          padding: 0 30px 30px;
          color: #6B7280;
          font-size: 15px;
          border-top: 1px solid #E5E7EB;
        }

        .footer {
          text-align: center;
          padding: 25px 30px;
          background: #F9FAFB;
          font-size: 13px;
          color: #9CA3AF;
        }

        .footer a {
          color: ${primaryColor};
          text-decoration: none;
        }
      </style>
    </head>

    <body>
      <div class="container">

        <!-- Header -->
        <div class="header">
          <h1>${emailTitle}</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <p>${emailSubTitle}</p>
        </div>

        <!-- Button -->
        ${
          btnText || btnLink
            ? `
              <div class="button-wrapper">
                ${
                  btnLink
                    ? `<a href="${btnLink}" class="button" target="_blank">${btnText}</a>`
                    : `<div class="button">${btnText}</div>`
                }
              </div>`
            : ""
        }

        <!-- Below Text -->
        ${
          belowText || belowLink
            ? `
            <div class="below">
              ${belowText ? `<p>${belowText}</p>` : ""}
              ${
                belowLink
                  ? `<a href="${belowLink}" target="_blank">${belowLink}</a>`
                  : ""
              }
            </div>`
            : ""
        }

        <!-- Thank You -->
        <div class="thank-you">
          <p>Thank you<br><strong>${process.env.APP_NAME || ''}</strong></p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>${footerNote || ""}</p>
          ${
            footerLink
              ? `<a href="${footerLink}" target="_blank">${footerLink}</a>`
              : ""
          }
        </div>

      </div>
    </body>
    </html>
    `;

    return html;
};

module.exports = generateHTML;