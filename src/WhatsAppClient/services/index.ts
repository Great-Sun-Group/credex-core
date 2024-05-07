import axios from "axios";
import {
  LinkTextParams,
  LinkWidget,
  TextParams,
  TextWidget,
} from "./TextWidgetHandler";
require("dotenv").config();

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.DEV_TOKEN}`,
};

type message_type =
  | "Link"
  | "Previewed_Link"
  | "text"
  | "Button"
  | "Buttons"
  | "List"
  | "Form";

export type MessageChildPayload = LinkTextParams | TextParams;

export type SendWhatsappMessageArguments = {
  message: string;
  receipent: string;
  message_type: message_type;
  payload: MessageChildPayload;
};

type MainMessagePayload = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: string;
  text: MessageChildPayload;
};

export async function SendWhatsappMessage(args: SendWhatsappMessageArguments) {
  let payload: MainMessagePayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: args.receipent,
    type: args.message_type,
    text: determineMessagePaload(args.message_type, args.payload),
  };
  const response = await axios.post(`${process.env.WEB_HOOK_DOMAIN}`, payload, {
    headers,
  });
  return response;
}

function determineMessagePaload(
  type: message_type,
  specificPayload: MessageChildPayload
): MessageChildPayload {
  switch (type) {
    case "Link":
      return LinkWidget(specificPayload);
    default:
      return TextWidget(specificPayload);
  }
}
