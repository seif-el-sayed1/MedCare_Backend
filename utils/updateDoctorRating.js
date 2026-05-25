const prisma = require("../startup/db"); 

const updateDoctorRating = async (doctorId) => {
    const result = await prisma.rating.aggregate({
        where: { doctorId },
        _avg: { rating: true },
        _count: { rating: true }
    });

    await prisma.doctor.update({
        where: { id: doctorId },
        data: {
            ratingsAverage: result._avg.rating ?? 0,
            ratingQuantity: result._count.rating
        }
    });
};

module.exports = updateDoctorRating;