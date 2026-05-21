const PDFDocument = require("pdfkit")

const BLUE = "#1A6FB5"
const LIGHT_BLUE = "#EBF4FF"
const DARK = "#1A1A2E"
const GRAY = "#6B7280"

const generateAppointmentPDF = (appointment) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 })
        const buffers = []

        doc.on("data", (chunk) => buffers.push(chunk))
        doc.on("end", () => resolve(Buffer.concat(buffers)))
        doc.on("error", reject)

        const pageWidth = doc.page.width
        const pageHeight = doc.page.height

        // Frame
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
            .lineWidth(2)
            .stroke(BLUE)

        // inner frame
        doc.rect(25, 25, pageWidth - 50, pageHeight - 50)
            .lineWidth(0.5)
            .stroke(BLUE)

        // Header Background 
        doc.rect(20, 20, pageWidth - 40, 80)
            .fill(BLUE)

        doc.fontSize(24).font("Helvetica-Bold").fillColor("white")
            .text("MedCare", 50, 40, { align: "center" })

        doc.fontSize(11).font("Helvetica").fillColor("white")
            .text("Appointment Confirmation", 50, 68, { align: "center" })

        doc.moveDown(3)

        // Section Helper
        const sectionTitle = (title, y) => {
            doc.rect(35, y, pageWidth - 70, 24).fill(BLUE)
            doc.fontSize(12).font("Helvetica-Bold").fillColor("white")
                .text(title, 45, y + 6)
            doc.moveDown(0.3)
        }

        const infoRow = (label, value) => {
            const rowY = doc.y
            doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK)
                .text(label, 45, rowY, { lineBreak: false, width: 150 })
            doc.fontSize(10).font("Helvetica").fillColor(GRAY)
                .text(value || "N/A", 200, rowY, { lineBreak: false })
            doc.moveDown(1.5)
        }

        // Patient Info
        let y = doc.y
        sectionTitle("Patient Information", y)
        doc.moveDown(0.8)
        infoRow("Name: ", `${appointment.user.firstName} ${appointment.user.lastName}`)
        infoRow("Phone: ", appointment.user.phone)
        infoRow("Email: ", appointment.user.email)
        doc.moveDown(0.5)

        // Doctor Info
        y = doc.y
        sectionTitle("Doctor Information", y)
        doc.moveDown(0.8)
        infoRow("Name: ", `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`)
        infoRow("Specialization: ", appointment.doctor.specialization.toLowerCase())    
        doc.moveDown(0.5)

        // Appointment Info
        y = doc.y
        sectionTitle("Appointment Details", y)
        doc.moveDown(0.8)
        infoRow("Appointment Code: ", appointment.appointmentCode)
        infoRow("Appointment Date: ", new Date(appointment.appointmentDate).toLocaleString())
        infoRow("Booked At: ", new Date(appointment.createdAt).toLocaleString())
        doc.moveDown(0.5)

        // Payment Info
        y = doc.y
        sectionTitle("Payment Details", y)
        doc.moveDown(0.8)
        infoRow("Total Price: ", `${appointment.totalPrice} EGP`)
        infoRow("Paid Amount: ", `${appointment.paidAmount} EGP`)
        infoRow("Remaining: ", `${appointment.remainingAmount} EGP`)
        doc.moveDown(0.8)

        // Divider
        doc.moveTo(35, doc.y).lineTo(pageWidth - 35, doc.y).lineWidth(1).stroke(BLUE)
        doc.moveDown(1.5)

        // Doctor Signature + Consultation Date
        const signY = doc.y

        // Doctor Signature
        doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK)
            .text("Doctor Signature: ", 45, signY)
        doc.fontSize(10).font("Helvetica").fillColor(GRAY)
            .text("________________", 45, signY + 16)

        // Consultation Date
        doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK)
            .text("Consultation Date: ", pageWidth / 2, signY)
        doc.fontSize(10).font("Helvetica").fillColor(GRAY)
            .text("________________", pageWidth / 2, signY + 16)

        doc.end()
    })
}

module.exports = {
    generateAppointmentPDF
}