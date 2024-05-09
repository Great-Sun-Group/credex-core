import { SendWhatsappMessage } from "../services";
import {
  MessageChildPayload,
  SendWhatsappMessageArguments,
} from "../types/PayloadsToWhatsApp";

export function SendOnBoardingMainMenu(receipent: string) {
  const menuText =
    "Welcome to the credex ecosystem. I’m the credex chatbot. I see that your number is not yet associated with a credex account. Would you like to create a new account?";
  const innerChilderPayload: MessageChildPayload = {
    body: menuText,
    preview_url: true,
  };
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
              id: "new_account",
              title: "Create New Account",
            },
          },
          {
            type: "reply",
            reply: {
              id: "more_about_credex1",
              title: "More About Credex",
            },
          },
          {
            type: "reply",
            reply: {
              id: "more_about_credex2",
              title: "More About Credex",
            },
          },
          {
            type: "reply",
            reply: {
              id: "more_about_credex3",
              title: "More About Credex",
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
