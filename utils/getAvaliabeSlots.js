const prisma = require('../startup/db');

/**
 * Utility function to generate doctor available slots for a specific date.
 * It validates the requested date, checks doctor's working hours,
 * filters booked appointments, and returns all slots with booking/closed status.
 */
async function getAvailableSlots(doctorId, date) {

  // Get doctor with available working days
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

  // Calculate current week range (Saturday -> Friday)
  const currentDay = now.getDay();
  const daysSinceSaturday = currentDay === 6 ? 0 : currentDay + 1;

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - daysSinceSaturday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Allow booking next week if today is Friday
  const isFriday = currentDay === 5;
  if (isFriday) {
    endOfWeek.setDate(endOfWeek.getDate() + 7);
  }

  // Validate requested date
  if (requestedDate < startOfWeek || requestedDate > endOfWeek) {
    return {
      success: false,
      message: 'Date must be within the current or next week'
    };
  }

  // Check if the whole day already passed
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

  // Get booked appointments for the selected day
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay
      },
    },
    select: { appointmentDate: true }
  });

  // Store booked times for fast lookup
  const bookedTimes = new Set(
    bookedAppointments.map(a => a.appointmentDate.toISOString())
  );

  const dayOfWeek = requestedDate.getDay();

  // Find doctor's working hours for this day
  const workingDay = doctor.workingHours.find(
    w => w.dayOfWeek === dayOfWeek
  );

  if (!workingDay) {
    return {
      success: false,
      message: 'Doctor is not working this day'
    };
  }

  const [startH, startM] = workingDay.startTime.split(':').map(Number);
  const [endH, endM] = workingDay.endTime.split(':').map(Number);

  const slot = new Date(requestedDate);
  slot.setHours(startH, startM, 0, 0);

  const endAt = new Date(requestedDate);
  endAt.setHours(endH, endM, 0, 0);

  const slots = [];

  // Generate all available slots
  while (slot < endAt) {

    const slotISO = new Date(slot).toISOString();

    const isBooked = bookedTimes.has(slotISO);

    // Slot is closed if less than 1 hour remains before it
    const oneHourBefore = new Date(slot.getTime() - 60 * 60 * 1000);
    const isClosed = oneHourBefore <= now;

    slots.push({
      time: `${slot.getHours().toString().padStart(2, '0')}:${slot.getMinutes().toString().padStart(2, '0')}`,
      datetime: slotISO,
      isBooked,
      isClosed
    });

    // Move to next slot
    slot.setMinutes(
      slot.getMinutes() + workingDay.slotDuration
    );
  }

  return slots;
}

module.exports = { getAvailableSlots };