const asyncHandler = require("express-async-handler");
const QRCode = require('qrcode');
const prisma = require("../startup/db");
const ApiError = require("../utils/ApiError");
const ApiFeatures = require("../utils/ApiFeatures");
const PaymentController = require("./payment.controller");
const { generateAppointmentPDF } = require("../utils/generateReports");

class AppointmentController {
    //@desc book an appointment
    //@route POST /api/v1/appointments
    //@access public
    bookAppointment = asyncHandler(async (req, res, next) => {
        const { doctorId } = req.params;
        const { date, paymentType } = req.body;

        const appointmentDate = new Date(date);

        const now = new Date();

        // Check if slot is closed (less than 1 hour before appointment)
        const oneHourBefore = new Date(appointmentDate.getTime() - 60 * 60 * 1000);
        if (oneHourBefore <= now) {
            return next(new ApiError('This appointment slot is no longer available for booking', 400));
        }

        const startOfDay = new Date(appointmentDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(appointmentDate);
        endOfDay.setHours(23, 59, 59, 999);


        const appointment = await prisma.$transaction(async (tx) => {

            const bookedAppointmentWithAntotherUser = await tx.appointment.findFirst({
                where: {
                    doctorId,
                    appointmentDate: {
                        gte: new Date(appointmentDate.getTime() - 60 * 60 * 1000),
                        lte: new Date(appointmentDate.getTime() + 60 * 60 * 1000)
                    },
                    appointmentStatus: {
                        in: ["PENDING", "CONFIRMED"]
                    }
                }            });

            if (bookedAppointmentWithAntotherUser) {
                throw new ApiError("This appointment slot is already booked, please add to waiting list", 400);
            }

            // check same day appointment
            const existingSameDayAppointment = await tx.appointment.findFirst({
                where: {
                    userId: req.user.id,
                    doctorId,
                    appointmentDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            if (existingSameDayAppointment) {
                throw new ApiError(
                    'You already have an appointment with this doctor on this day',
                    400
                );
            }

            // check conflict within 1 hour
            const conflictingAppointment = await tx.appointment.findFirst({
                where: {
                    userId: req.user.id,
                    appointmentDate: {
                        gte: new Date(appointmentDate.getTime() - 60 * 60 * 1000),
                        lte: new Date(appointmentDate.getTime() + 60 * 60 * 1000)
                    }
                }
            });

            if (conflictingAppointment) {
                throw new ApiError(
                    'You have a conflicting appointment within 1 hour of the requested time',
                    400
                );
            }

            // check doctor exists
            const doctor = await tx.doctor.findUnique({
                where: { id: doctorId }
            });

            if (!doctor) {
                throw new ApiError('Doctor not found', 404);
            }

            // create appointment
            return tx.appointment.create({
                data: {
                    doctorId,
                    userId: req.user.id,
                    appointmentDate: date,
                    paymentType,
                    totalPrice: doctor.consultationPrice,
                }
            });
        });

        res.status(201).json({
            success: true,
            message: `Your appointment has been created successfully.
                        Kindly complete your payment within 1 hour to confirm your appointment and receive your booking code and receipt.
                        If payment is not completed within this time, the appointment will be cancelled automatically.
                        Thank you for trusting our service.`,
            data: appointment
        });
    });

}

module.exports = new AppointmentController();