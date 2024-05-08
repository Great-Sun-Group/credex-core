import axios from "axios";
import { TextWidget } from "./TextWidgetHandler";
require("dotenv").config();
import {
  MainMessagePayload,
  SendWhatsappMessageArguments,
  message_type,
  MessageChildPayload,
} from "../types/PayloadsToWhatsApp";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.DEV_TOKEN}`,
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
      return TextWidget(specificPayload);
    default:
      return TextWidget(specificPayload);
  }
}
