import { SendWhatsappMessage } from "../services";
import {
  MessageChildPayload,
  SendWhatsappMessageArguments,
} from "../types/PayloadsToWhatsApp";

export function SendRequestForCredexAmount(receipent: string) {
  const menuText =
    "Please enter the amount you want to offer: \n\n#EXAMPLE: *10*";
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
