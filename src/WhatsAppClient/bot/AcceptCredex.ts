import { SendWhatsappMessage } from "../services";
import {
  MessageChildPayload,
  SendWhatsappMessageArguments,
} from "../types/PayloadsToWhatsApp";

export function SendCredexOfferAlert(receipent: string) {
  const menuText =
    "You just received a credex offer with details: \n\nAMOUNT: *$10* \nPhone: *263777666555*\nFROM: *John Doe* \n\nPlease accept or decline.";

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
              id: "accept_credex_offer",
              title: "Accept",
            },
          },
          {
            type: "reply",
            reply: {
              id: "decline_credex_offer",
              title: "Decline",
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

export function SendCredexAcceptedMessage(receipent: string) {
  const menuText =
    "Congratulations 🎉, congratulations, you have accepted your credex request.";
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

export function SendCredexDeclinedMessage(receipent: string) {
  const menuText = "💔 you have declined your credex request...";
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
