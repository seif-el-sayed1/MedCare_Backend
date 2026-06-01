const prisma = require('../startup/db');

/**
 * Generate available doctor slots for a specific date.
 * Returns slot status including booked, paid, closed,
 * ownership, and waiting list information.
 */
async function getAvailableSlots(doctorId, date, userId = null) {
    const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
            workingHours: {
                where: { isAvailable: true }
            }
        }
    });

    if (!doctor) throw new Error('Doctor not found');

    const requestedDate = new Date(date);
    const now = new Date();

    const currentDay = now.getDay();
    const daysSinceSaturday = currentDay === 6 ? 0 : currentDay + 1;

    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - daysSinceSaturday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const isFriday = currentDay === 5;
    if (isFriday) {
        endOfWeek.setDate(endOfWeek.getDate() + 7);
    }

    if (requestedDate < startOfWeek || requestedDate > endOfWeek) {
        return {
            success: false,
            message: 'Date must be within the current or next week'
        };
    }

    const endOfRequestedDay = new Date(requestedDate);
    endOfRequestedDay.setHours(23, 59, 59, 999);

    if (endOfRequestedDay < now) {
        return {
            success: false,
            message: 'This day has already passed'
        };
    }

    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await prisma.appointment.findMany({
        where: {
            doctorId,
            appointmentDate: {
                gte: startOfDay,
                lte: endOfDay
            },
            appointmentStatus: {
                not: 'CANCELLED'
            }
        },
        select: {
            appointmentDate: true,
            isPaid: true,
            userId: true
        }
    });

    // Use timestamps instead of Date objects to avoid timezone comparison issues
    const bookedMap = new Map(
        bookedAppointments.map(a => [
            new Date(a.appointmentDate).getTime(),
            {
                isPaid: a.isPaid,
                appointmentUserId: a.userId
            }
        ])
    );

    const waitingListRecords = await prisma.waitingList.findMany({
        where: {
            doctorId,
            requestedDate: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: 'WAITING'
        },
        select: {
            requestedDate: true,
            userId: true
        }
    });

    // Group waiting list users by slot timestamp
    const waitingMap = new Map();

    waitingListRecords.forEach(record => {
        const timeKey = new Date(record.requestedDate).getTime();

        if (!waitingMap.has(timeKey)) {
            waitingMap.set(timeKey, []);
        }

        waitingMap.get(timeKey).push(record.userId);
    });

    const dayOfWeek = requestedDate.getDay();

    const workingDay = doctor.workingHours.find(
        w => w.dayOfWeek === dayOfWeek
    );

    if (!workingDay) {
        return {
            success: false,
            message: 'Doctor is not working this day'
        };
    }

    const [startH, startM] = workingDay.startTime
        .split(':')
        .map(Number);

    const [endH, endM] = workingDay.endTime
        .split(':')
        .map(Number);

    const slot = new Date(requestedDate);
    slot.setHours(startH, startM, 0, 0);

    const endAt = new Date(requestedDate);
    endAt.setHours(endH, endM, 0, 0);

    const slots = [];

    while (slot < endAt) {
        const currentSlotTime = slot.getTime();
        const slotISO = slot.toISOString();

        const bookingData = bookedMap.get(currentSlotTime);
        const isBooked = !!bookingData;

        const isPaid = isBooked ? bookingData.isPaid : false;

        // Check whether the current user owns this appointment
        const isMine = !!(
            isBooked &&
            userId &&
            bookingData.appointmentUserId &&
            String(bookingData.appointmentUserId) === String(userId)
        );

        const waitingUsers = waitingMap.get(currentSlotTime) || [];

        const isUserInWaitingList = !!(
            userId &&
            waitingUsers.some(id => String(id) === String(userId))
        );

        // Slot becomes unavailable 1 hour before its start time
        const oneHourBefore = new Date(
            slot.getTime() - 60 * 60 * 1000
        );

        const isClosed = oneHourBefore <= now;

        slots.push({
            time: `${slot.getHours().toString().padStart(2, '0')}:${slot.getMinutes().toString().padStart(2, '0')}`,
            datetime: slotISO,
            isBooked,
            isPaid,
            isClosed,
            isMine,
            inWaitingList: isUserInWaitingList
        });

        slot.setMinutes(
            slot.getMinutes() + workingDay.slotDuration
        );
    }

    return slots;
}

module.exports = { getAvailableSlots };