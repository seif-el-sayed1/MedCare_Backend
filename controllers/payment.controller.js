const crypto = require("crypto");
const axios = require("axios");
const prisma = require("../startup/db")

class PaymentClass {
  async createClientSecretKey(appointment, user) {

    // Convert price to cents (Paymob works with smallest currency unit)
    const amount = appointment.paymentType === "PARTIALLY_PAID" 
        ? (appointment.totalPrice / 2) * 100 
        : appointment.totalPrice * 100;

    const items = [
        {
            name: "Appointment Fees",
            description: "It's Appointment Fees",
            quantity: 1,
            amount,
        },
    ];

    const requestBody = {
        amount,
        currency: "EGP",
        payment_methods: [Number(process.env.PAYMOB_INTEGRATION_ID)],

        items,

        billing_data: {
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,

            phone_number: user.phone || "NA",

            // Paymob requires full address structure even if dummy values
            apartment: 1,
            floor: 1,
            street: 1,
            building: 1,

            city: user.city?.nameEn || "NA",
            state: user.region?.nameEn || "NA",
            country: "Egypt",

            postal_code: "NA",
            promoCodeApplied: "NA",
        },

        customer: {
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,

            // Optional metadata field for Paymob tracking
            extras: { re: "22" },
        },

        // Additional metadata (not required by Paymob core API)
        extras: { ee: 22 },
    };

    const response = await axios.post(
        "https://accept.paymob.com/v1/intention/",
        requestBody,

        // Secret key used for server-to-server authentication
        { headers: { Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}` } }
    );

    const transaction = await prisma.payment.create({
        data: {
            appointmentId: appointment.id,

            // Extract order code from Paymob response ID format
            orderCode: response.data.id.split("_")[2],

            userId: user.id,

            // Convert back from cents to main currency unit
            amount: amount / 100,
            billedAmount: amount / 100,

            status: "PENDING",

            // Save Paymob client secret for later payment confirmation
            clientSecret: response.data.client_secret,
        }
    });

    return { transaction, clientSecret: response.data.client_secret };
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

        const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

        const hmacFields = [
            transactionData?.amount_cents, transactionData?.created_at, transactionData?.currency,
            transactionData?.error_occured, transactionData?.has_parent_transaction, transactionData?.id,
            transactionData?.integration_id, transactionData?.is_3d_secure, transactionData?.is_auth,
            transactionData?.is_capture, transactionData?.is_refunded, transactionData?.is_standalone_payment,
            transactionData?.is_voided, transactionData?.order?.id, transactionData?.owner,
            transactionData?.pending, transactionData?.source_data?.pan, transactionData?.source_data?.sub_type,
            transactionData?.source_data?.type, transactionData?.success
        ].join("");

        const calculatedHmac = crypto
            .createHmac("sha512", hmacSecret)
            .update(hmacFields)
            .digest("hex");

        if (calculatedHmac !== receivedHmac) {
            return res.status(401).json({ success: false, message: "Invalid HMAC" });
        }

        const nextPaymentIntention = transactionData.payment_key_claims?.next_payment_intention;
        let order_id;
        if (nextPaymentIntention) {
            order_id = nextPaymentIntention.split("_")[2];
        }

        if (!order_id) {
            return res.status(400).json({ success: false, message: "Invalid order data" });
        }

        let status = "FAILED";
        if (transactionData.success) status = "SUCCESS";
        else if (transactionData.pending) status = "PENDING";

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

            if (!payment.success) return;

            const appointment = await tx.appointment.findUnique({
                where: { id: payment.appointmentId }
            });

            if (!appointment) throw new Error("Appointment not found");

            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, "0")}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getFullYear()).slice(-2)}`;

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const doctorTodayCount = await tx.appointment.count({
                where: {
                    doctorId: appointment.doctorId,
                    createdAt: { gte: todayStart, lte: todayEnd },
                    appointmentStatus: "CONFIRMED",
                    isPaid: true,
                }
            });

            const appointmentCode = `MC-${dateStr}-${String(doctorTodayCount + 1).padStart(3, "0")}`;

            await tx.appointment.update({
                where: { id: payment.appointmentId },
                data: {
                    appointmentStatus: "CONFIRMED",
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