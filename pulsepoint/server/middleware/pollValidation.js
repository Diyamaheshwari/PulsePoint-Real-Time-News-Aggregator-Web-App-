const { body, param } = require('express-validator');

// Validation for creating a poll
exports.createPollValidation = [
  body('question')
    .trim()
    .notEmpty().withMessage('Question is required')
    .isLength({ max: 300 }).withMessage('Question cannot be longer than 300 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot be longer than 1000 characters'),
    
  body('options')
    .isArray({ min: 2 }).withMessage('At least 2 options are required')
    .custom((options) => {
      for (let option of options) {
        if (!option.text || option.text.trim().length === 0) {
          throw new Error('Option text cannot be empty');
        }
        if (option.text.length > 200) {
          throw new Error('Option text cannot be longer than 200 characters');
        }
      }
      return true;
    }),
    
  body('expiresAt')
    .notEmpty().withMessage('Expiration date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    }),
    
  body('tags')
    .optional()
    .isArray()
    .custom((tags) => {
      if (tags) {
        for (let tag of tags) {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            throw new Error('Tags must be non-empty strings');
          }
          if (tag.length > 50) {
            throw new Error('Tag cannot be longer than 50 characters');
          }
        }
      }
      return true;
    })
];

// Validation for voting on a poll
exports.voteValidation = [
  param('id').isMongoId().withMessage('Invalid poll ID'),
  
  body('optionIndex')
    .isInt({ min: 0 }).withMessage('Option index must be a non-negative integer')
];

// Validation for getting poll results
exports.pollIdValidation = [
  param('id').isMongoId().withMessage('Invalid poll ID')
];

// Validation for updating a poll
exports.updatePollValidation = [
  param('id').isMongoId().withMessage('Invalid poll ID'),
  
  body('question')
    .optional()
    .trim()
    .notEmpty().withMessage('Question cannot be empty')
    .isLength({ max: 300 }).withMessage('Question cannot be longer than 300 characters'),
    
  body('options')
    .optional()
    .isArray({ min: 2 }).withMessage('At least 2 options are required')
    .custom((options) => {
      if (!options) return true; // Options are optional in update
      
      for (let option of options) {
        if (!option.text || option.text.trim().length === 0) {
          throw new Error('Option text cannot be empty');
        }
        if (option.text.length > 200) {
          throw new Error('Option text cannot be longer than 200 characters');
        }
      }
      return true;
    })
];
