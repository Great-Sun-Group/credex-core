import { SendWhatsappMessage } from "../services";
import {
  MessageChildPayload,
  SendWhatsappMessageArguments,
} from "../types/PayloadsToWhatsApp";

export function SendRequestForFirstName(receipent: string) {
  const menuText = "Please enter your first name:";
  const innerChilderPayload: MessageChildPayload = {
    body: menuText,
    preview_url: false,
  };
  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "text",
    payload: innerChilderPayload,
  };

  SendWhatsappMessage(payload)
    .then((res) => {
      console.log(res.data);
    })
    .catch((err) => {
      console.log(err.response.data);
    });
}

export function SendRequestLastName(receipent: string) {
  const menuText = "Please enter your last name:";
  const innerChilderPayload: MessageChildPayload = {
    body: menuText,
    preview_url: false,
  };
  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "text",
    payload: innerChilderPayload,
  };

  SendWhatsappMessage(payload)
    .then((res) => {
      console.log(res.data);
    })
    .catch((err) => {
      console.log(err.response.data);
    });
}

export function SendRequestDefaultCurrencyDenomination(receipent: string) {
  const menuText = "Please enter your preffered default currency denomination:";
  const innerChilderPayload: MessageChildPayload = {
    body: menuText,
    preview_url: false,
  };
  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "text",
    payload: innerChilderPayload,
  };

  SendWhatsappMessage(payload)
    .then((res) => {
      console.log(res.data);
    })
    .catch((err) => {
      console.log(err.response.data);
    });
}
