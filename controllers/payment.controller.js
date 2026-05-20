const crypto = require("crypto");
const axios = require("axios");
const prisma = require("../startup/db")

class PaymentClass {
  async createClientSecretKey(appointment, user) {
    return new Promise(async (resolve, reject) => {
      try {
        // If partially paid, charge half the price; otherwise charge full price (convert to cents)
        const amount = appointment.paymentType === "PARTIALLY_PAID" ? (appointment.totalPrice / 2) * 100 : appointment.totalPrice * 100; 
        let items = [
          {
            name: "Appointment Fees",
            description: "It's Appointment Fees",
            quantity: 1,
            amount: amount,
          },
        ];
        let paymobIntegrationId = Number(process.env.PAYMOB_INTEGRATION_ID);
        const user_id = user.id;
        let address = {};
        const requestBody = {
          amount,
          currency: "EGP",
          payment_methods: [paymobIntegrationId],
          items,
          billing_data: {
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            phone_number: user.phone || "NA",
            apartment: address?.apartment || 1,
            floor: address?.floor || 1,
            street: address?.street || 1,
            building: address?.building || 1,
            city: user.city?.nameEn || "NA",
            state: user.region?.nameEn || "NA",
            country: "Egypt",
            postal_code: address?.postalCode || "NA",
            promoCodeApplied: "NA",
          },
          customer: {
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
            extras: {
              re: "22",
            },
          },
          extras: {
            ee: 22,
          },
        };
        const secretKey = process.env.PAYMOB_SECRET_KEY;
        const response = await axios.post(
          "https://accept.paymob.com/v1/intention/",
          requestBody,
          {
            headers: { Authorization: `Token ${secretKey}` },
          },
        );

        // Paymob's Intention API generates a unique order ID in the format "xxx_xxx_ORDERID"
        const transaction = await prisma.payment.create({
            data: {
                appointmentId: appointment.id,
                orderCode: response.data.id.split("_")[2],
                userId: user_id,
                amount: amount / 100,
                billedAmount: amount / 100,
                status: "PENDING",
                clientSecret: response.data.client_secret,
            }
        });

        resolve({ transaction, clientSecret: response.data.client_secret });
      } catch (error) {
        reject(error);
      }
    });
  }


}

module.exports = new PaymentClass();