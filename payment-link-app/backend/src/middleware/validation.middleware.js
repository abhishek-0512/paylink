const { body, validationResult } = require('express-validator');
const { BadRequestError } = require('../utils/errors');

/**
 * Utility to process validation results and throw BadRequestError if errors exist
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const firstError = errors.array()[0].msg;
    return next(new BadRequestError(firstError));
  };
};

// Payment Creation Rules
const validateCreatePayment = validate([
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required'),
  body('customerPhone')
    .trim()
    .notEmpty()
    .withMessage('Customer phone number is required')
    .matches(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/)
    .withMessage('Invalid phone number format'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a valid number')
    .custom((val) => Number(val) > 0)
    .withMessage('Amount must be greater than zero'),
  body('description')
    .optional()
    .trim()
]);

// Payment Signature Verification Rules
const validateVerifyPayment = validate([
  body('paymentId')
    .trim()
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('orderId')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),
  body('gatewayPaymentId')
    .trim()
    .notEmpty()
    .withMessage('Gateway Payment ID is required'),
  body('signature')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
]);

// WhatsApp Send Link Rules
const validateSendWhatsApp = validate([
  body('paymentId')
    .trim()
    .notEmpty()
    .withMessage('Payment ID is required')
]);

module.exports = {
  validateCreatePayment,
  validateVerifyPayment,
  validateSendWhatsApp
};
