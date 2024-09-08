import * as Joi from 'joi';

export const accountSchemas = {
  createAccount: Joi.object({
    ownerID: Joi.string().uuid().required(),
    accountType: Joi.string().required(),
    accountName: Joi.string().required(),
    accountHandle: Joi.string().required(),
    defaultDenom: Joi.string().required(),
  }),

  getAccountByHandle: Joi.object({
    accountHandle: Joi.string().required(),
  }),

  updateAccount: Joi.object({
    ownerID: Joi.string().uuid().required(),
    accountID: Joi.string().uuid().required(),
    accountName: Joi.string(),
    accountHandle: Joi.string(),
    defaultDenom: Joi.string(),
  }),

  authorizeForAccount: Joi.object({
    memberHandleToBeAuthorized: Joi.string().required(),
    accountID: Joi.string().uuid().required(),
    ownerID: Joi.string().uuid().required(),
  }),

  unauthorizeForAccount: Joi.object({
    memberIDtoBeUnauthorized: Joi.string().uuid().required(),
    accountID: Joi.string().uuid().required(),
    ownerID: Joi.string().uuid().required(),
  }),

  updateSendOffersTo: Joi.object({
    memberIDtoSendOffers: Joi.string().uuid().required(),
    accountID: Joi.string().uuid().required(),
    ownerID: Joi.string().uuid().required(),
  }),
};