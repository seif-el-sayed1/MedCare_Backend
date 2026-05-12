const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../startup/db");

class Auth {
    
    generateToken = async (userId, role, model = "user") => {

        // Calculate token expiration date based on JWT_EXPIRATION env
        const tokenExpDate = new Date();
        tokenExpDate.setDate(
            tokenExpDate.getDate() +
            parseInt(process.env.JWT_EXPIRATION.toString().slice(0, -1))
        );

        // Create JWT token with userId and role
        const token = jwt.sign(
            { userId, role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        // Save token and expiration date in database
        await prisma[model].update({
            where: { id: userId },
            data: {
                token,
                tokenExpDate,
            },
        });

        // Return generated token info
        return { token, tokenExpDate };
    };

}


module.exports = new Auth();