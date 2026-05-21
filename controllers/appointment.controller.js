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

    //@desc appointment payment
    //@route POST /appointments/:id
    //@access private
    makePayment = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
        });
        if (!appointment) {
            return next(new ApiError('Appointment not found', 404));
        }
        if (appointment.isPaid) {
            return next(new ApiError("Appointment is already paid", 400));
        }

        // Create client secret key
        PaymentController
            .createClientSecretKey(appointment, req.user)
            .then(async (data) => {
                const publicKey = process.env.PAYMOB_PUBLIC_KEY;

                data.paymentKey =
                    `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=` +
                    data.clientSecret;

                res.status(200).json({
                    success: true,
                    message: "Payment key created successfully",
                    data: data
                });
            })
            .catch((err) => {
                next(err);
            });
    });

    //@desc generate appointment report
    //@route GET /appointments/:id/report
    //@access private
    generateReport = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                user: true,
                doctor: true
            }
        });
        if (!appointment) {
            return next(new ApiError('Appointment not found', 404));
        }
        if (!appointment.isPaid) {
            return next(new ApiError("Appointment is not paid yet", 400));
        }
        const pdf = await generateAppointmentPDF(appointment);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=appointment-${appointment.appointmentCode}.pdf`);

        res.send(pdf);
    });

    //@desc get all appointments for admin
    //@route GET /appointments
    //@access private
    getAllAppointments = asyncHandler(async (req, res, next) => {
        const apiFeatues = new ApiFeatures(prisma.appointment, req.query, "Appointment")
            .search()
            .filter()
            .sort()
            .paginate()

        const data = await apiFeatues.execute({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        specialization: true
                    }
                }
            }
        });

        await apiFeatues.calculatePagination();

        res.status(200).json({
            success: true,
            results: data.length,
            pagination: apiFeatues.paginationResult,
            data: data
        });
    });

    //@desc get doctor appointments
    //@route GET /appointments/:doctorId
    //@access private
    getDoctorAppointments = asyncHandler(async (req, res, next) => {
        const { doctorId } = req.params;

        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        if (!doctor) return next(new ApiError("Doctor not found", 404));

        const apiFeatues = new ApiFeatures(prisma.appointment, req.query, "Appointment", {
            where: { doctorId }
        })
            .search()
            .filter()
            .sort()
            .paginate()

        const data = await apiFeatues.execute({
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });

        await apiFeatues.calculatePagination();

        res.status(200).json({
            success: true,
            results: data.length,
            pagination: apiFeatues.paginationResult,
            data
        });
    });

    //@desc get single appointment
    //@route GET /appointments/:id
    //@access private
    getOneAppointment = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                doctor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        specialization: true
                    }
                }
            }
        });
        if (!appointment) {
            return next(new ApiError("Appointment not found", 404));
        }
        res.status(200).json({
            success: true,
            data: appointment
        });
    });

    //@desc update paid status
    //@route PATCH /appointments/:id
    //@access private
    updateAppointmentPayment = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const { paidAmount } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({ where: { id } });
            if (!appointment) throw new ApiError("Appointment not found", 404);

            if (appointment.totalPrice === appointment.paidAmount)
                throw new ApiError("Appointment is already fully paid", 400);

            if (paidAmount < appointment.remainingAmount)
                throw new ApiError(`You must pay the full remaining amount: ${appointment.remainingAmount} EGP`, 400);

            if (paidAmount > appointment.remainingAmount)
                throw new ApiError(`Paid amount exceeds remaining amount: ${appointment.remainingAmount} EGP`, 400);

            const newPaidAmount = appointment.paidAmount + paidAmount;
            const newRemainingAmount = appointment.totalPrice - newPaidAmount;

            await tx.appointment.update({
                where: { id },
                data: {
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemainingAmount,
                    paymentType: "FULLY_PAID",
                    isFullPaid: true
                }
            });

            return { newPaidAmount, newRemainingAmount };
        });

        res.status(200).json({
            success: true,
            message: "Payment updated successfully",
            data: {
                paidAmount: result.newPaidAmount,
                remainingAmount: result.newRemainingAmount,
                isFullPaid: true
            }
        });
    });

    //@desc change appointment status
    //@route PATCH /appointments/:id/status
    //@access Private
    updateAppointmentStatus = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const { status } = req.body;
        const appointment = await prisma.appointment.findUnique({ where: { id } });

        if (!appointment) return next(new ApiError("Appointment not found", 404));

        if (status === appointment.appointmentStatus)
            return next(new ApiError(`Status is already ${status.toLowerCase()}`, 400));

        await prisma.appointment.update({
            where: { id },
            data: {
                appointmentStatus: status
            }
        });

        res.status(200).json({
            success: true,
            message: "Status updated successfully",
            data: { status }
        });
    });

    //@desc update consultation date
    //@route PATCH /appointments/:id/consultation
    //@access Private
    updateAppointmentConsultation = asyncHandler(async (req, res, next) => {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({ where: { id } });

        if (!appointment) return next(new ApiError("Appointment not found", 404));

        await prisma.appointment.update({
            where: { id },
            data: {
                consultationDate: new Date(),
                hasConsultation: false
            }
        });

        res.status(200).json({
            success: true,
            message: "consultation updated successfully",
            data: {
                consultationDate: new Date(),
                hasConsultation: false
            }
        });
    });

}

module.exports = new AppointmentController();