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

  async callBack(req, res) {
    try {
        // Paymob sends HMAC either in query params or headers — check both
        const receivedHmac = req.query.hmac || req.headers["x-hmac-sha512"];
        if (!receivedHmac) {
            return res.status(400).json({ success: false, message: "Missing HMAC" });
        }

        const transactionData = req.body?.obj;
        if (!transactionData) {
            return res.status(400).json({ success: false, message: "Invalid callback data" });
        }

        // Extract the order ID from the next_payment_intention string (format: "xxx_xxx_ORDERID")
        // This links the callback back to the payment record we created in createClientSecretKey
        const nextPaymentIntention = transactionData.payment_key_claims?.next_payment_intention;
        let order_id;
        if (nextPaymentIntention) {
            order_id = nextPaymentIntention.split("_")[2];
        }

        if (!order_id) {
            return res.status(400).json({ success: false, message: "Invalid order data" });
        }

        // Map Paymob transaction state to our PaymentStatus enum
        let status = "FAILED";
        if (transactionData.success) status = "SUCCESS";
        else if (transactionData.pending) status = "PENDING";

        // Use a transaction to ensure payment update and appointment confirmation are atomic
        // If any step fails, both operations are rolled back
        await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.update({
                where: { orderCode: order_id },
                data: {
                    success: transactionData.success,
                    pending: transactionData.pending,
                    cardNum: transactionData.data?.card_num || null,
                    cardType: transactionData.data?.card_type || null,
                    currency: transactionData.currency || null,
                    status,
                }
            });

            // Only proceed to confirm the appointment if payment was successful
            if (!payment.success) return;

            const appointment = await tx.appointment.findUnique({
                where: { id: payment.appointmentId }
            });

            if (!appointment) throw new Error("Appointment not found");

            // Build date string in DDMMYY format for the appointment code (e.g. "210526")
            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, "0")}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getFullYear()).slice(-2)}`;

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Count today's confirmed appointments for this doctor to generate a sequential code
            const doctorTodayCount = await tx.appointment.count({
                where: {
                    doctorId: appointment.doctorId,
                    createdAt: { gte: todayStart, lte: todayEnd },
                    appointmentStatus: "CONFIRMED",
                    isPaid: true,
                }
            });

            // Format: MC-DDMMYY-001 (e.g. MC-210526-003 = 3rd appointment today)
            const appointmentCode = `MC-${dateStr}-${String(doctorTodayCount + 1).padStart(3, "0")}`;

            await tx.appointment.update({
                where: { id: payment.appointmentId },
                data: {
                    appointmentStatus: "CONFIRMED",
                    // For partial payment: pay half now, remaining half later
                    paidAmount: appointment.paymentType === "PARTIALLY_PAID"
                        ? appointment.totalPrice / 2
                        : appointment.totalPrice,
                    remainingAmount: appointment.paymentType === "PARTIALLY_PAID"
                        ? appointment.totalPrice / 2
                        : 0,
                    appointmentCode,
                    isPaid: true,
                    isFullPaid: appointment.paymentType === "FULLY_PAID",
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "Callback processed",
            status,
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
  }

}

module.exports = new PaymentClass();