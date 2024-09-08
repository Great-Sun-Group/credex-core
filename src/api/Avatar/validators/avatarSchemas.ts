import Joi from 'joi';

export const requestRecurringSchema = Joi.object({
  signerMemberID: Joi.string().uuid().required(),
  requestorAccountID: Joi.string().uuid().required(),
  counterpartyAccountID: Joi.string().uuid().required(),
  InitialAmount: Joi.number().positive().required(),
  Denomination: Joi.string().required(),
  nextPayDate: Joi.date().iso().required(),
  daysBetweenPays: Joi.number().integer().positive().required(),
  securedCredex: Joi.boolean(),
  credspan: Joi.when('securedCredex', {
    is: true,
    then: Joi.forbidden(),
    otherwise: Joi.number().integer().min(7).max(35).required()
  }),
  remainingPays: Joi.number().integer().min(0)
});

export const acceptRecurringSchema = Joi.object({
  avatarID: Joi.string().uuid().required(),
  signerID: Joi.string().uuid().required()
});

export const cancelRecurringSchema = Joi.object({
  signerID: Joi.string().uuid().required(),
  cancelerAccountID: Joi.string().uuid().required(),
  avatarID: Joi.string().uuid().required()
});