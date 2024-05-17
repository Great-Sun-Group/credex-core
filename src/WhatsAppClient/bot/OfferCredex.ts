import { SendWhatsappMessage } from "../services";
import {
  MessageChildPayload,
  SendWhatsappMessageArguments,
} from "../types/PayloadsToWhatsApp";

export function SendRequestForCredexAmount(receipent: string) {
  const menuText =
    "Please enter the amount you want to offer: \n\n\n#EXAMPLE: *10*";
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

export function SendRequestForCredexReceipentPhoneNumber(receipent: string) {
  const menuText =
    "Please enter the receipent's phone number: \n\n\n#EXAMPLE: *263777666555*";
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

export function SendTransactionConfirmationMenu(receipent: string) {
  const menuText =
    "You are about to make a credex offer with details: \n\nAMOUNT: *$10* \nPhone: *263777666555*\nNAME: *John Doe* \n\nPlease confirm or cancel.";

  const payload: SendWhatsappMessageArguments = {
    message: menuText,
    receipent: receipent,
    message_type: "interactive",
    payload: {
      type: "button",
      // header: {},
      body: {
        text: menuText,
      },
      footer: {
        text: "",
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "confirm_credex_offer",
              title: "Confirm",
            },
          },
          {
            type: "reply",
            reply: {
              id: "cancel_credex_offer",
              title: "Cancel",
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
