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

const ONBOARDING_SUCCESS_MESSAGE = `
Excellent. I’ve created your account. The next step is to charge your account with USD. You can
message Zimbabwe Change Solutions at +263123456789 any time to connect with a verified
agent who can charge your account for you.`;

export function SendOnboardingSuccessMessage(receipent: string) {
  const payload: SendWhatsappMessageArguments = {
    message: ONBOARDING_SUCCESS_MESSAGE,
    receipent: receipent,
    message_type: "interactive",
    payload: {
      type: "button",
      // header: {},
      body: {
        text: ONBOARDING_SUCCESS_MESSAGE,
      },
      footer: {
        text: "",
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "hie",
              title: "Menu",
            },
          },
        ],
      },
    },
  };

  SendWhatsappMessage(payload)
    .then((res) => {
      console.log(res.data);
    })
    .catch((err) => {
      console.log(err.response.data);
    });
}
